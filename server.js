import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import puppeteer from "puppeteer-core";
import { execSync } from "child_process";
import pg from "pg";
const { Pool } = pg;

dotenv.config();

// Lazy-loaded chromium path (cached after first call)
let cachedChromiumPath = undefined;

function getChromiumPath() {
  if (cachedChromiumPath !== undefined) return cachedChromiumPath;
  
  try {
    cachedChromiumPath = execSync('which chromium', { encoding: 'utf-8' }).trim();
    if (cachedChromiumPath) return cachedChromiumPath;
  } catch (e) {}
  
  try {
    cachedChromiumPath = execSync('which chromium-browser', { encoding: 'utf-8' }).trim();
    if (cachedChromiumPath) return cachedChromiumPath;
  } catch (e) {}
  
  try {
    cachedChromiumPath = execSync('which google-chrome', { encoding: 'utf-8' }).trim();
    if (cachedChromiumPath) return cachedChromiumPath;
  } catch (e) {}
  
  // Fallback paths
  const fallbacks = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    process.env.CHROMIUM_PATH
  ];
  
  for (const p of fallbacks) {
    if (p) {
      cachedChromiumPath = p;
      return cachedChromiumPath;
    }
  }
  
  cachedChromiumPath = null;
  return null;
}

// Simple profanity filter (replaces bad-words package for ES module compatibility)
const badWordsList = ['damn', 'hell', 'crap', 'shit', 'fuck', 'ass', 'bitch', 'bastard', 'piss'];
const filter = {
  clean: (text) => {
    if (!text) return text;
    let result = text;
    badWordsList.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      result = result.replace(regex, '*'.repeat(word.length));
    });
    return result;
  }
};

const app = express();
const port = process.env.PORT || 5000;

// ================== PAYMENT ROUTER ==================
// Builds redirect URLs for payment providers
// Skippy Stack is a redirector only - never authenticates with payment providers

function buildPaymentUrl(provider, value, amount, invoiceNumber) {
  if (!provider || !value) return null;
  
  const cleanValue = value.trim();
  const formattedAmount = parseFloat(amount).toFixed(2);
  const encodedNote = encodeURIComponent(invoiceNumber || '');
  
  switch (provider.toLowerCase()) {
    case 'venmo':
      const venmoUsername = cleanValue.replace(/^@/, '');
      return `https://venmo.com/${encodeURIComponent(venmoUsername)}?txn=pay&amount=${formattedAmount}&note=${encodedNote}`;
    
    case 'paypal':
      const paypalUsername = cleanValue.replace(/^@/, '');
      return `https://paypal.me/${encodeURIComponent(paypalUsername)}/${formattedAmount}`;
    
    case 'cashapp':
      const cashappUsername = cleanValue.startsWith('$') ? cleanValue.slice(1) : cleanValue;
      return `https://cash.app/$${encodeURIComponent(cashappUsername)}/${formattedAmount}`;
    
    case 'zelle':
      return cleanValue;
    
    case 'square':
    case 'stripe':
    case 'custom':
      return cleanValue.startsWith('http') ? cleanValue : `https://${cleanValue}`;
    
    default:
      return cleanValue.startsWith('http') ? cleanValue : null;
  }
}

// ================== END PAYMENT ROUTER ==================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health check endpoint - responds immediately for deployment checks
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: Date.now() });
});

// Main landing page at root (must be before static middleware)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "landing.html"));
});

// App login/dashboard at /app
app.get("/app", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// STATIC FRONTEND (serves script.js, style.css, etc.)
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// FILE UPLOADS
const upload = multer({ storage: multer.memoryStorage() });

// SUPABASE ADMIN CLIENT
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// DIRECT POSTGRES POOL (bypasses Supabase PostgREST cache)
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});


// AUTH MIDDLEWARE: VALIDATE SUPABASE JWT TOKEN
app.use(async (req, res, next) => {
  const authHeader = req.header("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.userId = null;
    return next();
  }

  const token = authHeader.substring(7);
  
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !data.user) {
      req.userId = null;
    } else {
      req.userId = data.user.id;
    }
  } catch (err) {
    req.userId = null;
  }
  
  next();
});

// SMALL HELPERS
function makeReferralCode(userId) {
  if (userId) {
    return userId.replace(/-/g, "").slice(0, 10);
  }
  return Math.random().toString(36).slice(2, 10);
}

// CHECK SUBSCRIPTION STATUS
async function hasActiveSubscription(userId) {
  if (!userId) return false;
  
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("subscription_status, trial_ends_at, subscription_ends_at")
    .eq("id", userId)
    .single();
  
  if (!profile) return false;
  
  // Check trial
  if (profile.trial_ends_at) {
    const trialEnd = new Date(profile.trial_ends_at);
    if (trialEnd > new Date()) {
      return true;
    }
  }
  
  // Check active subscription
  if (profile.subscription_status === "active") {
    if (!profile.subscription_ends_at) return true;
    const subEnd = new Date(profile.subscription_ends_at);
    if (subEnd > new Date()) return true;
  }
  
  return false;
}

// AUTH ONLY MIDDLEWARE (no subscription check)
async function requireAuth(req, res, next) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated", needsAuth: true });
  }
  next();
}

// ADMIN ONLY MIDDLEWARE
async function requireAdmin(req, res, next) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated", needsAuth: true });
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (error || !profile || !profile.is_admin) {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

// AI ACCESS MIDDLEWARE - Checks ai_enabled flag AND usage limits
async function requireAI(req, res, next) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated", needsAuth: true });
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("ai_enabled, ai_actions_used, ai_actions_limit, ai_billing_cycle_start")
    .eq("id", userId)
    .single();

  if (error || !profile || !profile.ai_enabled) {
    return res.status(403).json({ error: "AI subscription required", needsAI: true });
  }

  // Check if billing cycle needs to be reset (monthly)
  const cycleStart = new Date(profile.ai_billing_cycle_start || Date.now());
  const now = new Date();
  const monthsPassed = (now.getFullYear() - cycleStart.getFullYear()) * 12 + (now.getMonth() - cycleStart.getMonth());
  
  if (monthsPassed >= 1) {
    // Reset the billing cycle
    await supabaseAdmin
      .from("profiles")
      .update({
        ai_actions_used: 0,
        ai_billing_cycle_start: now.toISOString()
      })
      .eq("id", userId);
    
    req.aiActionsUsed = 0;
    req.aiActionsLimit = profile.ai_actions_limit || 300;
  } else {
    req.aiActionsUsed = profile.ai_actions_used || 0;
    req.aiActionsLimit = profile.ai_actions_limit || 300;
  }

  // Check if user has exceeded their limit
  if (req.aiActionsUsed >= req.aiActionsLimit) {
    const resetDate = new Date(cycleStart);
    resetDate.setMonth(resetDate.getMonth() + 1);
    return res.status(429).json({ 
      error: "AI action limit reached", 
      needsUpgrade: true,
      actionsUsed: req.aiActionsUsed,
      actionsLimit: req.aiActionsLimit,
      resetDate: resetDate.toISOString(),
      message: `You've used ${req.aiActionsUsed}/${req.aiActionsLimit} AI actions this month. Resets on ${resetDate.toLocaleDateString()}.`
    });
  }

  next();
}

// Log AI usage and increment counter
async function logAIUsage(userId, toolType) {
  console.log(`Logging AI usage for user ${userId}, tool: ${toolType}`);
  
  // Always do the direct increment - most reliable approach
  try {
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("ai_actions_used")
      .eq("id", userId)
      .single();
    
    if (fetchError) {
      console.error("Failed to fetch profile for AI usage:", fetchError);
      return;
    }
    
    const currentUsage = profile?.ai_actions_used || 0;
    const newUsage = currentUsage + 1;
    
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ ai_actions_used: newUsage })
      .eq("id", userId);
    
    if (updateError) {
      console.error("Failed to update AI usage:", updateError);
    } else {
      console.log(`AI usage updated: ${currentUsage} -> ${newUsage}`);
    }
    
    // Also try to log to ai_usage_logs table (optional, don't fail if it doesn't exist)
    try {
      await supabaseAdmin
        .from("ai_usage_logs")
        .insert({ user_id: userId, tool_type: toolType });
    } catch (logErr) {
      // Table might not exist, that's okay
    }
  } catch (err) {
    console.error("Failed to log AI usage:", err);
  }
}

// Get current AI usage info for a user
async function getAIUsageInfo(userId) {
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("ai_actions_used, ai_actions_limit, ai_billing_cycle_start")
      .eq("id", userId)
      .single();
    
    if (!profile) return null;
    
    const cycleStart = new Date(profile.ai_billing_cycle_start || Date.now());
    const resetDate = new Date(cycleStart);
    resetDate.setMonth(resetDate.getMonth() + 1);
    
    const actionsUsed = profile.ai_actions_used || 0;
    const actionsLimit = profile.ai_actions_limit || 300;
    
    return {
      actions_used: actionsUsed,
      actions_limit: actionsLimit,
      reset_date: resetDate.toISOString(),
      is_at_limit: actionsUsed >= actionsLimit,
      is_warning: actionsUsed >= 250 && actionsUsed < actionsLimit
    };
  } catch (err) {
    console.error("Failed to get AI usage info:", err);
    return null;
  }
}

// SUBSCRIPTION MIDDLEWARE FOR PROTECTED ROUTES
// Simplified: just checks authentication (no Stripe billing integration)
async function requireSubscription(req, res, next) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated", needsAuth: true });
  }
  next();
}

// PROFILE ROUTES

app.get("/api/profile", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json(null);

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    return res.status(500).json({ error: error.message });
  }

  res.json(data || null);
});

app.post("/api/profile", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const payload = { ...req.body, id: userId };
  
  // Check for existing profile and preserve critical fields
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id, trial_ends_at, subscription_status, subscription_plan, subscription_ends_at, ai_enabled, ai_plan, ai_subscription_id, ai_actions_used, ai_actions_limit, ai_billing_cycle_start")
    .eq("id", userId)
    .single();
  
  // Set trial only on FIRST profile creation (no existing profile at all)
  if (!existing) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    payload.trial_ends_at = trialEnd.toISOString();
    payload.subscription_status = "trial";
  } else {
    // PRESERVE existing subscription and AI settings - never overwrite them
    payload.trial_ends_at = existing.trial_ends_at;
    payload.subscription_status = existing.subscription_status;
    payload.subscription_plan = existing.subscription_plan;
    payload.subscription_ends_at = existing.subscription_ends_at;
    payload.ai_enabled = existing.ai_enabled;
    payload.ai_plan = existing.ai_plan;
    payload.ai_subscription_id = existing.ai_subscription_id;
    payload.ai_actions_used = existing.ai_actions_used;
    payload.ai_actions_limit = existing.ai_actions_limit;
    payload.ai_billing_cycle_start = existing.ai_billing_cycle_start;
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .upsert({
      ...payload,
      preferred_language: payload.preferred_language || existing?.preferred_language || 'en',
      preferred_template: payload.preferred_template || existing?.preferred_template || 'basic_clean',
      stripe_connect_enabled: true
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// UPLOAD LOGO
app.post("/api/profile/logo", upload.single("logo"), async (req, res) => {
  const userId = req.userId;
  console.log("Logo upload attempt for user:", userId);
  
  if (!userId) {
    console.log("Logo upload failed: Not authenticated");
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (!req.file) {
    console.log("Logo upload failed: No file provided");
    return res.status(400).json({ error: "No file provided" });
  }

  console.log("File received:", req.file.originalname, req.file.size, "bytes");
  
  const ext = req.file.originalname.split(".").pop();
  const pathKey = `${userId}/logo.${ext || "png"}`;

  try {
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("logos")
      .upload(pathKey, req.file.buffer, {
        upsert: true,
        contentType: req.file.mimetype,
      });

    if (uploadErr) {
      console.error("Logo storage upload error:", uploadErr);
      return res.status(500).json({ error: uploadErr.message });
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("logos").getPublicUrl(pathKey);

    console.log("Logo uploaded successfully:", publicUrl);
    res.json({ logo_url: publicUrl });
  } catch (err) {
    console.error("Logo upload exception:", err);
    res.status(500).json({ error: "Failed to upload logo" });
  }
});

// GET LIFETIME EARLY BIRD COUNT
app.get("/api/profile/lifetime-count", async (req, res) => {
  try {
    const { count, error } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("subscription_plan", "lifetime_early");

    if (error) {
      console.error("Error counting lifetime early:", error);
      return res.json({ count: 0 });
    }

    res.json({ count: count || 0 });
  } catch (err) {
    console.error("Error in lifetime count:", err);
    res.json({ count: 0 });
  }
});

// Generate payment URL from profile settings
app.post("/api/generate-payment-url", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  
  const { amount, invoiceNumber } = req.body;
  
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: "Valid amount required" });
  }
  
  // Get user's payment settings
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("payment_provider, payment_value")
    .eq("id", userId)
    .single();
  
  if (error || !profile) {
    return res.status(404).json({ error: "Profile not found" });
  }
  
  if (!profile.payment_provider || !profile.payment_value) {
    return res.json({ payment_url: null, message: "No payment provider configured" });
  }
  
  const paymentUrl = buildPaymentUrl(
    profile.payment_provider,
    profile.payment_value,
    amount,
    invoiceNumber || ''
  );
  
  res.json({ payment_url: paymentUrl });
});

// ================== PAYMENT LINKS CRUD (Direct SQL) ==================

// GET all payment links for user
app.get("/api/payment-links", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const result = await pgPool.query(
      `SELECT * FROM payment_links WHERE profile_id = $1 ORDER BY sort_order ASC`,
      [userId]
    );
    res.json(result.rows || []);
  } catch (err) {
    console.error("Error fetching payment links:", err);
    res.status(500).json({ error: "Failed to fetch payment links" });
  }
});

// POST create a new payment link
app.post("/api/payment-links", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { provider, label, url, is_default } = req.body;

  if (!provider || !url) {
    return res.status(400).json({ error: "Provider and URL are required" });
  }

  try {
    // If this is set as default, unset any existing default
    if (is_default) {
      await pgPool.query(
        `UPDATE payment_links SET is_default = false WHERE profile_id = $1`,
        [userId]
      );
    }

    // Get the max sort_order for this user
    const orderResult = await pgPool.query(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM payment_links WHERE profile_id = $1`,
      [userId]
    );
    const nextOrder = orderResult.rows[0].next_order;

    const result = await pgPool.query(
      `INSERT INTO payment_links (profile_id, provider, label, url, is_default, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, provider, label || provider, url, is_default || false, nextOrder]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating payment link:", err);
    res.status(500).json({ error: "Failed to create payment link" });
  }
});

// PUT update a payment link
app.put("/api/payment-links/:id", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.params;
  const { provider, label, url, is_default } = req.body;

  try {
    // If setting as default, unset any existing default
    if (is_default) {
      await pgPool.query(
        `UPDATE payment_links SET is_default = false WHERE profile_id = $1`,
        [userId]
      );
    }

    const result = await pgPool.query(
      `UPDATE payment_links 
       SET provider = $1, label = $2, url = $3, is_default = $4
       WHERE id = $5 AND profile_id = $6
       RETURNING *`,
      [provider, label, url, is_default || false, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Payment link not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating payment link:", err);
    res.status(500).json({ error: "Failed to update payment link" });
  }
});

// DELETE a payment link
app.delete("/api/payment-links/:id", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.params;

  try {
    await pgPool.query(
      `DELETE FROM payment_links WHERE id = $1 AND profile_id = $2`,
      [id, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting payment link:", err);
    res.status(500).json({ error: "Failed to delete payment link" });
  }
});

// PATCH set a payment link as default
app.patch("/api/payment-links/:id/default", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.params;

  try {
    // Unset any existing default
    await pgPool.query(
      `UPDATE payment_links SET is_default = false WHERE profile_id = $1`,
      [userId]
    );

    // Set the new default
    const result = await pgPool.query(
      `UPDATE payment_links SET is_default = true WHERE id = $1 AND profile_id = $2 RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Payment link not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error setting default payment link:", err);
    res.status(500).json({ error: "Failed to set default payment link" });
  }
});

// ================== END PAYMENT LINKS ==================

// CLIENTS

app.get("/api/clients", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json([]);

  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/clients/:id", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.params;
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/clients", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { name, email, phone, address, notes } = req.body;

  try {
    const result = await pgPool.query(
      `INSERT INTO clients (user_id, name, email, phone, address, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, name, email || null, phone || null, address || null, notes || null]
    );
    
    console.log(`Client ${result.rows[0].id} created for user ${userId}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Client creation error:", err);
    res.status(500).json({ error: err.message || "Failed to create client" });
  }
});

app.put("/api/clients/:id", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.params;
  const updates = { ...req.body };
  delete updates.id;
  delete updates.user_id;

  const { data, error } = await supabaseAdmin
    .from("clients")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete("/api/clients/:id", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// INVOICES

app.get("/api/invoices", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json([]);

  const showArchived = req.query.archived === 'true';
  
  try {
    // Use direct SQL to join with clients table and get client_name
    const archivedCondition = showArchived 
      ? "AND i.archived = true" 
      : "AND (i.archived IS NULL OR i.archived = false)";
    
    const { rows: invoices } = await pgPool.query(`
      SELECT i.*, c.name as client_name, c.email as client_email, c.phone as client_phone
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.user_id = $1 ${archivedCondition}
      ORDER BY i.created_at DESC
    `, [userId]);
    
    res.json(invoices);
  } catch (err) {
    console.error("Error fetching invoices:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/invoices", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { client_id, client_name, client_address, issue_date, notes, template, payment_url, subtotal, tax_amount, total, items } = req.body;

  // Validate client_id is a valid UUID or null (reject old integer IDs)
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validClientId = (client_id && isValidUUID.test(client_id)) ? client_id : null;

  const dbClient = await pgPool.connect();
  try {
    await dbClient.query('BEGIN');
    
    // Generate invoice number: INV-YYYYMMDD-XXX
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const countResult = await dbClient.query(
      `SELECT COUNT(*) as cnt FROM invoices WHERE user_id = $1 AND invoice_number LIKE $2`,
      [userId, `INV-${dateStr}-%`]
    );
    const seqNum = (parseInt(countResult.rows[0].cnt) + 1).toString().padStart(3, '0');
    const invoiceNumber = `INV-${dateStr}-${seqNum}`;
    
    // Insert invoice
    const invResult = await dbClient.query(
      `INSERT INTO invoices (user_id, client_id, client_address, issue_date, notes, template, payment_url, subtotal, tax_amount, total, status, invoice_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, invoice_number`,
      [userId, validClientId, client_address || null, issue_date || new Date().toISOString().split('T')[0], notes || null, template || 'basic_clean', payment_url || null, subtotal || 0, tax_amount || 0, total || 0, 'draft', invoiceNumber]
    );
    
    const inv = invResult.rows[0];
    
    // Bulk insert line items
    if (Array.isArray(items) && items.length) {
      const values = items.map((item, idx) => {
        return `($1, $${idx * 4 + 2}, $${idx * 4 + 3}, $${idx * 4 + 4}, $${idx * 4 + 5})`;
      }).join(', ');
      
      const params = [inv.id];
      items.forEach(item => {
        const qty = item.quantity || 1;
        const unitPrice = item.unit_price || 0;
        const itemTotal = item.total || (qty * unitPrice);
        params.push(item.description || '', qty, unitPrice, itemTotal);
      });
      
      await dbClient.query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES ${values}`,
        params
      );
    }
    
    await dbClient.query('COMMIT');
    console.log(`Invoice ${inv.id} created with ${items?.length || 0} items`);
    res.json({ id: inv.id, invoice_number: inv.invoice_number });
  } catch (err) {
    await dbClient.query('ROLLBACK');
    console.error("Invoice creation error:", err);
    res.status(500).json({ error: err.message || "Failed to create invoice" });
  } finally {
    dbClient.release();
  }
});

// Update invoice
app.put("/api/invoices/:id", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const invoiceIdParam = req.params.id;
  const { client_id, client_name, client_address, issue_date, notes, template, payment_url, subtotal, tax_amount, total, items } = req.body;
  
  // Validate client_id is a valid UUID or null (reject old integer IDs)
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validClientId = (client_id && isValidUUID.test(client_id)) ? client_id : null;

  // Verify invoice belongs to user - try UUID first, then invoice_number
  let existing = null;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoiceIdParam);
  
  if (isUUID) {
    const { data, error } = await supabaseAdmin
      .from("invoices")
      .select("id, user_id")
      .eq("id", invoiceIdParam)
      .eq("user_id", userId)
      .single();
    existing = data;
  } else {
    // Try looking up by invoice_number
    const { data, error } = await supabaseAdmin
      .from("invoices")
      .select("id, user_id")
      .eq("invoice_number", invoiceIdParam)
      .eq("user_id", userId)
      .single();
    existing = data;
  }

  if (!existing) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  
  const invoiceId = existing.id; // Use the actual UUID

  // Update invoice
  const { data: inv, error: errInv } = await supabaseAdmin
    .from("invoices")
    .update({
      client_id: validClientId,
      client_address: client_address || null,
      issue_date,
      notes,
      template: template || "basic_clean",
      payment_url: payment_url || null,
      subtotal,
      tax_amount,
      total
    })
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .select()
    .single();

  if (errInv) {
    console.error("Invoice update error:", errInv);
    return res.status(500).json({ error: errInv.message });
  }

  // Delete old items and insert new ones using direct SQL
  // Use inv.id (the actual UUID) not invoiceId (which may be invoice number from frontend)
  const actualInvoiceId = inv.id;
  try {
    await pgPool.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [actualInvoiceId]);
    
    if (Array.isArray(items) && items.length) {
      for (const i of items) {
        const qty = i.quantity || 1;
        const unitPrice = i.unit_price || 0;
        const itemTotal = i.total || (qty * unitPrice);
        
        await pgPool.query(
          `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES ($1, $2, $3, $4, $5)`,
          [actualInvoiceId, i.description || '', qty, unitPrice, itemTotal]
        );
      }
      console.log(`Updated ${items.length} invoice items for invoice ${actualInvoiceId}`);
    }
  } catch (itemErr) {
    console.error("Invoice items update error:", itemErr);
    return res.status(500).json({ error: itemErr.message });
  }

  res.json({ id: inv.id, invoice_number: inv.invoice_number });
});

app.get("/api/invoices/:id", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const invoiceIdParam = req.params.id;

  try {
    // Use direct SQL to bypass Supabase schema cache issues
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoiceIdParam);
    
    // Fetch invoice with client info joined
    const invoiceQuery = isUUID
      ? `SELECT i.*, c.name as client_name, c.email as client_email, c.phone as client_phone, c.address as client_full_address
         FROM invoices i
         LEFT JOIN clients c ON i.client_id = c.id
         WHERE i.id = $1 AND i.user_id = $2`
      : `SELECT i.*, c.name as client_name, c.email as client_email, c.phone as client_phone, c.address as client_full_address
         FROM invoices i
         LEFT JOIN clients c ON i.client_id = c.id
         WHERE i.invoice_number = $1 AND i.user_id = $2`;
    
    const { rows: invoices } = await pgPool.query(invoiceQuery, [invoiceIdParam, userId]);
    
    if (!invoices.length) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    
    const invoice = invoices[0];
    const invoiceId = invoice.id;

    // Fetch line items
    const { rows: items } = await pgPool.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC`,
      [invoiceId]
    );
    console.log(`Fetched ${items.length} line items for invoice ${invoiceId}`);

    // Build client object from joined data
    let client = null;
    if (invoice.client_id) {
      client = {
        id: invoice.client_id,
        name: invoice.client_name,
        email: invoice.client_email,
        phone: invoice.client_phone,
        address: invoice.client_full_address
      };
    }

    // Fetch job data if linked
    let job = null;
    if (invoice.job_id) {
      const { rows: jobs } = await pgPool.query(
        `SELECT id, client_name, address, job_type, status FROM jobs WHERE id = $1 AND user_id = $2`,
        [invoice.job_id, userId]
      );
      if (jobs.length) job = jobs[0];
    }

    // Fetch attachments/photos
    const { rows: attachments } = await pgPool.query(
      `SELECT * FROM invoice_attachments WHERE invoice_id = $1`,
      [invoiceId]
    );

    // Return invoice with related data
    res.json({ 
      ...invoice, 
      items: items || [], 
      client: client || null, 
      job: job || null, 
      attachments: attachments || [] 
    });
  } catch (err) {
    console.error("Error fetching invoice detail:", err);
    res.status(500).json({ error: err.message });
  }
});

// INVOICE PHOTOS

app.post(
  "/api/invoices/:id/photos",
  upload.array("photos"),
  async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const invoiceId = req.params.id;
    const files = req.files || [];
    if (!files.length) return res.json({ ok: true });

    for (const file of files) {
      const pathKey = `${userId}/${invoiceId}/${Date.now()}-${
        file.originalname
      }`;

      const { error: uploadErr } = await supabaseAdmin.storage
        .from("invoice-photos")
        .upload(pathKey, file.buffer, {
          upsert: false,
          contentType: file.mimetype,
        });

      if (uploadErr) {
        console.error(uploadErr);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from("invoice-photos").getPublicUrl(pathKey);

      await supabaseAdmin.from("invoice_attachments").insert({
        invoice_id: invoiceId,
        file_url: publicUrl,
        file_name: file.originalname,
      });
    }

    res.json({ ok: true });
  }
);

// Helper function to resolve invoice ID (UUID or invoice_number)
async function resolveInvoiceId(invoiceIdParam, userId) {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoiceIdParam);
  
  if (isUUID) {
    const { data } = await supabaseAdmin
      .from("invoices")
      .select("id")
      .eq("id", invoiceIdParam)
      .eq("user_id", userId)
      .single();
    return data?.id || null;
  } else {
    const { data } = await supabaseAdmin
      .from("invoices")
      .select("id")
      .eq("invoice_number", invoiceIdParam)
      .eq("user_id", userId)
      .single();
    return data?.id || null;
  }
}

// ARCHIVE INVOICE
app.post("/api/invoices/:id/archive", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const invoiceId = await resolveInvoiceId(req.params.id, userId);
    if (!invoiceId) return res.status(404).json({ error: "Invoice not found" });
    
    const { data, error } = await supabaseAdmin
      .from("invoices")
      .update({ archived: true })
      .eq("id", invoiceId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error("Error archiving invoice:", err);
    res.status(500).json({ error: "Failed to archive invoice" });
  }
});

// UNARCHIVE INVOICE
app.post("/api/invoices/:id/unarchive", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const invoiceId = await resolveInvoiceId(req.params.id, userId);
    if (!invoiceId) return res.status(404).json({ error: "Invoice not found" });
    
    const { data, error } = await supabaseAdmin
      .from("invoices")
      .update({ archived: false })
      .eq("id", invoiceId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error("Error unarchiving invoice:", err);
    res.status(500).json({ error: "Failed to unarchive invoice" });
  }
});

// DELETE INVOICE
app.delete("/api/invoices/:id", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const invoiceIdParam = req.params.id;
  console.log("Delete invoice request - invoiceIdParam:", invoiceIdParam, "userId:", userId);
  
  if (!invoiceIdParam) {
    return res.status(400).json({ error: "Invalid invoice ID" });
  }

  try {
    // First verify the invoice exists and belongs to this user using pgPool
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoiceIdParam);
    
    let rows = [];
    
    // Try to find the invoice - handle different ID formats gracefully
    try {
      if (isUUID) {
        const result = await pgPool.query(
          `SELECT id FROM invoices WHERE id = $1 AND user_id = $2`,
          [invoiceIdParam, userId]
        );
        rows = result.rows;
      } else {
        // Try by invoice_number first (safest for non-UUID IDs)
        const result = await pgPool.query(
          `SELECT id FROM invoices WHERE invoice_number = $1 AND user_id = $2`,
          [invoiceIdParam, userId]
        );
        rows = result.rows;
      }
    } catch (queryErr) {
      console.log("Query error (likely schema mismatch), treating as not found:", queryErr.message);
      rows = [];
    }
    
    console.log("Find result - invoice:", rows[0] || null);

    if (!rows.length) {
      // Return success even if not found - allows clearing ghost entries from frontend cache
      console.log("Invoice not in database (possibly cached ghost entry), returning success to clear cache");
      return res.json({ success: true, note: "Already deleted or cached entry cleared" });
    }
    
    const invoiceId = rows[0].id; // Use the actual UUID

    // Delete related items and attachments using pgPool
    await pgPool.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [invoiceId]);
    await pgPool.query(`DELETE FROM invoice_attachments WHERE invoice_id = $1`, [invoiceId]);

    // Then delete the invoice
    await pgPool.query(`DELETE FROM invoices WHERE id = $1 AND user_id = $2`, [invoiceId, userId]);
    
    console.log("Invoice deleted successfully:", invoiceId);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting invoice:", err);
    // Even on error, return success to allow clearing stale cache entries
    console.log("Returning success despite error to clear frontend cache");
    res.json({ success: true, note: "Cache entry cleared" });
  }
});

// PAYMENT ENDPOINTS

// Get contractor's payment link for an invoice
app.post("/api/invoices/:id/payment-link", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const invoiceId = req.params.id;

  try {
    const { data: invoice, error: errInv } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("user_id", userId)
      .single();

    if (errInv || !invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("business_name, payment_link")
      .eq("id", userId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Use contractor's custom payment link
    const paymentUrl = profile?.payment_link;
    
    if (!paymentUrl) {
      return res.status(400).json({ 
        error: "No payment link configured. Please add your Venmo, PayPal, or CashApp link in Settings." 
      });
    }

    // Save the payment link reference to the invoice
    const { error: updateErr } = await supabaseAdmin
      .from("invoices")
      .update({ payment_url: paymentUrl })
      .eq("id", invoiceId)
      .eq("user_id", userId);

    if (updateErr) {
      console.error("Error saving payment link:", updateErr);
    }

    res.json({ payment_url: paymentUrl });
  } catch (error) {
    console.error("Error getting payment link:", error);
    res.status(500).json({ error: "Failed to get payment link" });
  }
});

// Quick Pay - Use contractor's selected payment link (Venmo, PayPal, etc.)
app.post("/api/quick-pay", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { amount, description, sendMethod, email, name, phone, payment_url } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Valid amount is required" });
  }

  if (!payment_url) {
    return res.status(400).json({ error: "Payment link is required" });
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("business_name, business_email, business_phone")
      .eq("id", userId)
      .single();

    const businessName = profile?.business_name || 'Payment Request';
    const paymentDescription = description || 'Payment Request';
    
    // Use the payment URL passed from client
    const paymentUrl = payment_url;

    let sendResult = { sent: false };

    if (sendMethod === 'email' && email && name) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Payment Request from ${businessName}</h2>
            <p>Hi ${name},</p>
            <p>You have received a payment request for <strong>$${parseFloat(amount).toFixed(2)}</strong>.</p>
            ${description ? `<p><strong>For:</strong> ${description}</p>` : ''}
            <div style="margin: 30px 0; text-align: center;">
              <a href="${paymentUrl}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Pay Now - $${parseFloat(amount).toFixed(2)}</a>
            </div>
            <p style="color: #666; font-size: 14px;">Click the button above to pay via ${businessName}'s preferred payment method.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">Powered by Skippy Stack</p>
          </div>
        `;

        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'Skippy Stack <noreply@skippystack.com>',
          to: email,
          subject: `Payment Request: $${parseFloat(amount).toFixed(2)} from ${businessName}`,
          html: emailHtml,
        });

        sendResult = { sent: true, method: 'email', to: email };
      } catch (emailErr) {
        console.error("Error sending quick pay email:", emailErr);
        sendResult = { sent: false, error: 'Failed to send email' };
      }
    }

    res.json({ 
      payment_url: paymentUrl, 
      amount: amount,
      description: paymentDescription,
      sendResult
    });
  } catch (error) {
    console.error("Error creating quick pay link:", error);
    res.status(500).json({ error: "Failed to create payment link" });
  }
});

// Manually update invoice payment status
app.patch("/api/invoices/:id/payment-status", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const invoiceId = req.params.id;
  const { payment_status } = req.body;

  if (!["unpaid", "paid", "pending"].includes(payment_status)) {
    return res.status(400).json({ error: "Invalid payment status" });
  }

  try {
    const updateData = { payment_status };
    if (payment_status === "paid") {
      updateData.paid_at = new Date().toISOString();
    } else {
      updateData.paid_at = null;
    }

    const { data, error } = await supabaseAdmin
      .from("invoices")
      .update(updateData)
      .eq("id", invoiceId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    res.json({ success: true, invoice: data });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ error: "Failed to update payment status" });
  }
});

// Get payment statistics
app.get("/api/payments/stats", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json({ outstanding: 0, paid_month: 0, pending: 0 });

  try {
    const { data: invoices, error } = await supabaseAdmin
      .from("invoices")
      .select("total, payment_status, paid_at")
      .eq("user_id", userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    let outstanding = 0;
    let paid_month = 0;
    let pending = 0;

    (invoices || []).forEach(inv => {
      const total = parseFloat(inv.total) || 0;
      const status = inv.payment_status || 'unpaid';

      if (status === 'unpaid') {
        outstanding += total;
      } else if (status === 'pending') {
        pending += total;
      } else if (status === 'paid' && inv.paid_at) {
        const paidDate = new Date(inv.paid_at);
        if (paidDate.getMonth() === thisMonth && paidDate.getFullYear() === thisYear) {
          paid_month += total;
        }
      }
    });

    res.json({
      outstanding: outstanding.toFixed(2),
      paid_month: paid_month.toFixed(2),
      pending: pending.toFixed(2),
    });
  } catch (error) {
    console.error("Error getting payment stats:", error);
    res.status(500).json({ error: "Failed to get payment statistics" });
  }
});

// INVENTORY ENDPOINTS

// Get all inventory items
app.get("/api/inventory", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json([]);

  try {
    const { data, error } = await supabaseAdmin
      .from("inventory_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// Create new inventory item
// Helper function to normalize inventory item names for matching
function normalizeInventoryName(name) {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

app.post("/api/inventory", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { name, description, quantity, unit_price, category, unit_type, low_stock_threshold, smart_stack } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const normalizedName = normalizeInventoryName(name);
    const newQuantity = parseFloat(quantity) || 0;
    
    // If smart_stack is enabled, check for existing item with similar name
    if (smart_stack) {
      const { data: existingItems, error: searchError } = await supabaseAdmin
        .from("inventory_items")
        .select("*")
        .eq("user_id", userId);
      
      if (!searchError && existingItems) {
        // Find item with matching normalized name
        const matchingItem = existingItems.find(item => 
          normalizeInventoryName(item.name) === normalizedName
        );
        
        if (matchingItem) {
          // Add to existing item's quantity
          const existingQty = parseFloat(matchingItem.quantity) || 0;
          const updatedQty = existingQty + newQuantity;
          
          const { data: updatedItem, error: updateError } = await supabaseAdmin
            .from("inventory_items")
            .update({ quantity: updatedQty })
            .eq("id", matchingItem.id)
            .eq("user_id", userId)
            .select()
            .single();
          
          if (updateError) {
            return res.status(500).json({ error: updateError.message });
          }
          
          // Return with stacked flag so frontend knows it was merged
          return res.json({
            ...updatedItem,
            stacked: true,
            previous_quantity: existingQty,
            added_quantity: newQuantity
          });
        }
      }
    }
    
    // No existing item found or smart_stack disabled - create new
    const { data, error } = await supabaseAdmin
      .from("inventory_items")
      .insert({
        user_id: userId,
        name,
        description: description || null,
        quantity: newQuantity,
        unit_price: unit_price || 0,
        category: category || null,
        unit_type: unit_type || 'each',
        low_stock_threshold: low_stock_threshold || 0,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ ...data, stacked: false });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    res.status(500).json({ error: "Failed to create inventory item" });
  }
});

// Update inventory item
app.patch("/api/inventory/:id", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const itemId = req.params.id;

  try {
    const { name, description, quantity, unit_price, category, unit_type, low_stock_threshold } = req.body;

    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (unit_price !== undefined) updateData.unit_price = unit_price;
    if (category !== undefined) updateData.category = category;
    if (unit_type !== undefined) updateData.unit_type = unit_type;
    if (low_stock_threshold !== undefined) updateData.low_stock_threshold = low_stock_threshold;

    const { data, error } = await supabaseAdmin
      .from("inventory_items")
      .update(updateData)
      .eq("id", itemId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    res.status(500).json({ error: "Failed to update inventory item" });
  }
});

// Delete inventory item
app.delete("/api/inventory/:id", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const itemId = req.params.id;

  try {
    const { error } = await supabaseAdmin
      .from("inventory_items")
      .delete()
      .eq("id", itemId)
      .eq("user_id", userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    res.status(500).json({ error: "Failed to delete inventory item" });
  }
});

// QUOTES (formerly estimates)

app.get("/api/quotes", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json([]);

  const showArchived = req.query.archived === 'true';
  
  let query = supabaseAdmin
    .from("quotes")
    .select("*")
    .eq("user_id", userId);
  
  if (showArchived) {
    query = query.eq("archived", true);
  } else {
    query = query.or("archived.is.null,archived.eq.false");
  }
  
  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/quotes", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { client_id, client_name, client_address, quote_date, quote_number, notes, template, subtotal, tax, total, items, valid_until } = req.body;

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    
    // Insert quote - use correct column names that match database schema
    const quoteResult = await client.query(
      `INSERT INTO quotes (user_id, client_id, client_address, issue_date, valid_until, quote_number, notes, template, subtotal, tax_amount, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, quote_number`,
      [userId, client_id || null, client_address || null, quote_date || new Date().toISOString().split('T')[0], valid_until || null, quote_number || null, notes || null, template || 'basic_clean', subtotal || 0, tax || 0, total || 0, 'draft']
    );
    
    const quote = quoteResult.rows[0];
    
    // Bulk insert line items
    if (Array.isArray(items) && items.length) {
      const values = items.map((item, idx) => {
        return `($1, $${idx * 4 + 2}, $${idx * 4 + 3}, $${idx * 4 + 4}, $${idx * 4 + 5})`;
      }).join(', ');
      
      const params = [quote.id];
      items.forEach(item => {
        const qty = item.qty || item.quantity || 1;
        const unitPrice = item.unit_price || item.price || 0;
        const itemTotal = item.line_total || item.total || (qty * unitPrice);
        params.push(item.description || '', qty, unitPrice, itemTotal);
      });
      
      await client.query(
        `INSERT INTO quote_items (quote_id, description, quantity, unit_price, total) VALUES ${values}`,
        params
      );
    }
    
    await client.query('COMMIT');
    console.log(`Quote ${quote.id} created with ${items?.length || 0} items`);
    res.json({ id: quote.id, quote_number: quote.quote_number });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Quote creation error:", err);
    res.status(500).json({ error: err.message || "Failed to create quote" });
  } finally {
    client.release();
  }
});

// Update quote
app.put("/api/quotes/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const quoteId = req.params.id;
  const { client_id, client_name, client_address, quote_date, notes, template, subtotal, tax, total, items, valid_until } = req.body;

  // Verify quote belongs to user
  const { data: existing, error: errCheck } = await supabaseAdmin
    .from("quotes")
    .select("id, user_id")
    .eq("id", quoteId)
    .eq("user_id", userId)
    .single();

  if (errCheck || !existing) {
    return res.status(404).json({ error: "Quote not found" });
  }

  // Update quote - use correct column names that match database schema
  const { data: quote, error: errQuote } = await supabaseAdmin
    .from("quotes")
    .update({
      client_id,
      client_address: client_address || null,
      issue_date: quote_date || null,
      valid_until: valid_until || null,
      subtotal,
      tax_amount: tax,
      total,
      notes,
      template: template || "basic_clean"
    })
    .eq("id", quoteId)
    .eq("user_id", userId)
    .select()
    .single();

  if (errQuote) {
    console.error("Quote update error:", errQuote);
    return res.status(500).json({ error: errQuote.message });
  }

  // Delete old items and insert new ones
  const { error: errDeleteItems } = await supabaseAdmin
    .from("quote_items")
    .delete()
    .eq("quote_id", quoteId);

  if (errDeleteItems) {
    console.error("Quote items delete error:", errDeleteItems);
  }

  if (items && items.length) {
    const itemRows = items.map((it) => ({
      quote_id: quote.id,
      description: it.description,
      quantity: it.qty || it.quantity,
      unit_price: it.unit_price,
      total: it.line_total || it.total,
    }));

    const { error: errItems } = await supabaseAdmin
      .from("quote_items")
      .insert(itemRows);

    if (errItems) {
      console.error("Quote items insert error:", errItems);
      return res.status(500).json({ error: errItems.message });
    }
  }

  res.json({ id: quote.id, quote_number: quote.quote_number });
});

// Link/unlink invoice to job
app.patch("/api/invoices/:id/job", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const invoiceId = req.params.id;
  const { job_id } = req.body;

  // Verify invoice belongs to user
  const { data: existing, error: errCheck } = await supabaseAdmin
    .from("invoices")
    .select("id, user_id")
    .eq("id", invoiceId)
    .single();

  if (errCheck || !existing || existing.user_id !== userId) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  // If job_id provided, verify it belongs to user
  if (job_id) {
    const { data: job, error: errJob } = await supabaseAdmin
      .from("jobs")
      .select("id, user_id")
      .eq("id", job_id)
      .single();

    if (errJob || !job || job.user_id !== userId) {
      return res.status(404).json({ error: "Job not found" });
    }
  }

  // Update invoice job_id
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .update({ job_id: job_id || null })
    .eq("id", invoiceId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// Link/unlink quote to job
app.patch("/api/quotes/:id/job", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const quoteId = req.params.id;
  const { job_id } = req.body;

  // Verify quote belongs to user
  const { data: existing, error: errCheck } = await supabaseAdmin
    .from("quotes")
    .select("id, user_id")
    .eq("id", quoteId)
    .single();

  if (errCheck || !existing || existing.user_id !== userId) {
    return res.status(404).json({ error: "Quote not found" });
  }

  // If job_id provided, verify it belongs to user
  if (job_id) {
    const { data: job, error: errJob } = await supabaseAdmin
      .from("jobs")
      .select("id, user_id")
      .eq("id", job_id)
      .single();

    if (errJob || !job || job.user_id !== userId) {
      return res.status(404).json({ error: "Job not found" });
    }
  }

  // Update quote job_id
  const { data, error } = await supabaseAdmin
    .from("quotes")
    .update({ job_id: job_id || null })
    .eq("id", quoteId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.get("/api/quotes/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const quoteId = req.params.id;

  const { data: quote, error: errQuote } = await supabaseAdmin
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .single();

  if (errQuote) {
    if (errQuote.code === "PGRST116") {
      return res.status(404).json({ error: "Quote not found" });
    }
    return res.status(500).json({ error: errQuote.message });
  }

  if (!quote || quote.user_id !== userId) {
    return res.status(404).json({ error: "Quote not found" });
  }

  const { data: items, error: errItems } = await supabaseAdmin
    .from("quote_items")
    .select("*")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: true });

  if (errItems) return res.status(500).json({ error: errItems.message });

  let client = null;
  if (quote.client_id) {
    const { data: clientData } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("id", quote.client_id)
      .eq("user_id", userId)
      .single();
    client = clientData;
  }

  // Fetch job data if linked
  let job = null;
  if (quote.job_id) {
    const { data: jobData, error: errJob } = await supabaseAdmin
      .from("jobs")
      .select("id, client_name, address, job_type, status")
      .eq("id", quote.job_id)
      .eq("user_id", userId)
      .single();

    if (!errJob && jobData) {
      job = jobData;
    }
  }

  // Return quote with related data
  res.json({
    ...quote,
    items: items || [],
    client,
    job: job || null,
  });
});

// SEND QUOTE EMAIL
app.post("/api/quotes/:id/send-email", requireSubscription, async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail, recipientName } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ error: "Recipient email is required" });
    }

    const { data: quote, error: quoteError } = await supabaseAdmin
      .from("quotes")
      .select(`*, quote_items (*)`)
      .eq("id", id)
      .eq("user_id", req.userId)
      .single();

    if (quoteError || !quote) {
      return res.status(404).json({ error: "Quote not found" });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("business_name, business_email, business_phone, business_address, logo_url")
      .eq("id", req.userId)
      .single();

    const resendConnection = await getResendClient();
    if (!resendConnection) {
      return res.status(503).json({ error: "Email service is not configured" });
    }
    const { client: resend, fromEmail } = resendConnection;
    if (!fromEmail) {
      return res.status(503).json({ error: "Email sender address not configured. Please check your Resend settings." });
    }

    const escapeHtml = (text) => {
      if (!text) return '';
      return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    const businessName = escapeHtml(profile?.business_name || "Business");
    const quoteNumber = escapeHtml(quote.quote_number || quote.id);

    const itemsHtml = (quote.quote_items || []).map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.description)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${parseFloat(item.unit_price || 0).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${parseFloat(item.total || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .quote-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f3f4f6; padding: 10px; text-align: left; }
          .total-row { font-weight: bold; font-size: 1.2rem; }
          .footer { text-align: center; color: #6b7280; font-size: 0.875rem; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Quote from ${businessName}</h1>
        </div>
        <div class="content">
          <p>Hi ${escapeHtml(recipientName || 'there')},</p>
          <p>Please find your quote details below. A PDF copy is attached for your records.</p>
          
          <div class="quote-details">
            <p><strong>Quote #:</strong> ${quoteNumber}</p>
            <p><strong>Date:</strong> ${new Date(quote.quote_date || quote.created_at).toLocaleDateString()}</p>
            ${quote.notes ? `<p><strong>Notes:</strong> ${escapeHtml(quote.notes)}</p>` : ''}
            
            <table style="margin-top: 20px;">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr><td colspan="3" style="padding: 10px; text-align: right;">Subtotal:</td><td style="padding: 10px; text-align: right;">$${parseFloat(quote.subtotal || 0).toFixed(2)}</td></tr>
                <tr><td colspan="3" style="padding: 10px; text-align: right;">Tax:</td><td style="padding: 10px; text-align: right;">$${parseFloat(quote.tax || 0).toFixed(2)}</td></tr>
                <tr class="total-row"><td colspan="3" style="padding: 10px; text-align: right; color: #10b981;">Total:</td><td style="padding: 10px; text-align: right; color: #10b981;">$${parseFloat(quote.total || 0).toFixed(2)}</td></tr>
              </tfoot>
            </table>
          </div>

          <p>If you have any questions about this quote, please contact us:</p>
          <p>
            ${profile?.business_email ? `<strong>Email:</strong> ${escapeHtml(profile.business_email)}<br>` : ''}
            ${profile?.business_phone ? `<strong>Phone:</strong> ${escapeHtml(profile.business_phone)}` : ''}
          </p>

          <div class="footer">
            <p>This is an automated email from ${businessName}.</p>
            <p>Thank you for your business!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const pdfBuffer = await generateQuotePDF(quote, profile);

    const emailOptions = {
      from: fromEmail,
      to: recipientEmail,
      subject: `Quote #${quoteNumber} from ${profile?.business_name || 'Business'}`,
      html: emailBody
    };

    if (pdfBuffer) {
      emailOptions.attachments = [{
        filename: `Quote-${quote.quote_number || quote.id}.pdf`,
        content: pdfBuffer.toString('base64'),
        content_type: 'application/pdf'
      }];
    }

    const { data: emailResult, error: emailError } = await resend.emails.send(emailOptions);

    if (emailError) {
      console.error("Quote email send error:", emailError);
      return res.status(500).json({ error: "Failed to send email" });
    }

    await supabaseAdmin
      .from("quotes")
      .update({ sent_at: new Date().toISOString(), sent_to: recipientEmail, status: 'sent' })
      .eq("id", id);

    res.json({ success: true, message: "Quote sent successfully", emailId: emailResult.id });
  } catch (error) {
    console.error("Send quote error:", error);
    res.status(500).json({ error: "Failed to send quote email" });
  }
});

// ARCHIVE QUOTE
app.post("/api/quotes/:id/archive", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { data, error } = await supabaseAdmin
      .from("quotes")
      .update({ archived: true })
      .eq("id", req.params.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error("Error archiving quote:", err);
    res.status(500).json({ error: "Failed to archive quote" });
  }
});

// UNARCHIVE QUOTE
app.post("/api/quotes/:id/unarchive", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { data, error } = await supabaseAdmin
      .from("quotes")
      .update({ archived: false })
      .eq("id", req.params.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error("Error unarchiving quote:", err);
    res.status(500).json({ error: "Failed to unarchive quote" });
  }
});

// DELETE QUOTE
app.delete("/api/quotes/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const quoteId = parseInt(req.params.id, 10);
  if (isNaN(quoteId)) {
    return res.status(400).json({ error: "Invalid quote ID" });
  }

  try {
    // First verify the quote exists and belongs to this user
    const { data: quote, error: findError } = await supabaseAdmin
      .from("quotes")
      .select("id")
      .eq("id", quoteId)
      .eq("user_id", userId)
      .single();

    if (findError || !quote) {
      return res.status(404).json({ error: "Quote not found" });
    }

    // Delete related items
    await supabaseAdmin
      .from("quote_items")
      .delete()
      .eq("quote_id", quoteId);

    // Then delete the quote
    const { error } = await supabaseAdmin
      .from("quotes")
      .delete()
      .eq("id", quoteId)
      .eq("user_id", userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting quote:", err);
    res.status(500).json({ error: "Failed to delete quote" });
  }
});

// JOBS API - Job Folder Management

// Get all jobs
app.get("/api/jobs", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { status, search } = req.query;

  let query = supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (status && status !== 'all') {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(`client_name.ilike.%${search}%,address.ilike.%${search}%,job_type.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// Create a new job
app.post("/api/jobs", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { client_name, address, job_type, notes } = req.body;

  if (!client_name) {
    return res.status(400).json({ error: "Client name is required" });
  }

  // Generate folder name: ClientName_Address_Date_JobType
  const dateStr = new Date().toISOString().split('T')[0];
  const sanitize = (str) => (str || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  const folderName = `${sanitize(client_name)}_${sanitize(address)}_${dateStr}_${sanitize(job_type)}`;

  const { data, error } = await supabaseAdmin
    .from("jobs")
    .insert({
      user_id: userId,
      client_name,
      address: address || '',
      job_type: job_type || '',
      folder_name: folderName,
      notes: notes || '',
      status: 'open'
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get single job with related invoices, quotes, and voice notes
app.get("/api/jobs/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const jobId = req.params.id;

  const { data: job, error: jobError } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (jobError) {
    if (jobError.code === "PGRST116") {
      return res.status(404).json({ error: "Job not found" });
    }
    return res.status(500).json({ error: jobError.message });
  }

  // Get related invoices
  const { data: invoices } = await supabaseAdmin
    .from("invoices")
    .select("id, invoice_number, client_name, total, payment_status, created_at")
    .eq("job_id", jobId)
    .eq("user_id", userId);

  // Get related quotes
  const { data: quotes } = await supabaseAdmin
    .from("quotes")
    .select("id, quote_number, client_name, total, status, created_at")
    .eq("job_id", jobId)
    .eq("user_id", userId);

  // Get related voice notes
  const { data: voiceNotes } = await supabaseAdmin
    .from("voice_notes")
    .select("*")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  res.json({
    ...job,
    invoices: invoices || [],
    quotes: quotes || [],
    voice_notes: voiceNotes || []
  });
});

// Update job
app.patch("/api/jobs/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const jobId = req.params.id;
  const updates = req.body;

  // Regenerate folder name if key fields changed
  if (updates.client_name || updates.address || updates.job_type) {
    const { data: existing } = await supabaseAdmin
      .from("jobs")
      .select("client_name, address, job_type, job_date")
      .eq("id", jobId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      const clientName = updates.client_name || existing.client_name;
      const address = updates.address || existing.address;
      const jobType = updates.job_type || existing.job_type;
      const dateStr = existing.job_date || new Date().toISOString().split('T')[0];
      
      const sanitize = (str) => (str || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
      updates.folder_name = `${sanitize(clientName)}_${sanitize(address)}_${dateStr}_${sanitize(jobType)}`;
    }
  }

  const { data, error } = await supabaseAdmin
    .from("jobs")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Delete job
app.delete("/api/jobs/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const jobId = req.params.id;

  const { error } = await supabaseAdmin
    .from("jobs")
    .delete()
    .eq("id", jobId)
    .eq("user_id", userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// CALENDAR EVENTS API

// Get calendar events for a date range
app.get("/api/calendar-events", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { start_date, end_date } = req.query;
    
    console.log("Loading calendar events:", { userId, start_date, end_date });
    
    let query = supabaseAdmin
      .from("calendar_events")
      .select(`
        *,
        clients (id, name),
        jobs (id, folder_name, client_name),
        quotes (id, quote_number, client_name),
        invoices (id, number, client_name)
      `)
      .eq("user_id", userId)
      .order("event_datetime", { ascending: true });

    if (start_date) {
      query = query.gte("event_datetime", start_date);
    }
    if (end_date) {
      query = query.lte("event_datetime", end_date);
    }

    const { data, error } = await query;
    
    console.log("Calendar events result:", { count: data?.length || 0, error: error?.message });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    console.error("Error fetching calendar events:", err);
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

// Get single calendar event
app.get("/api/calendar-events/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { data, error } = await supabaseAdmin
      .from("calendar_events")
      .select(`
        *,
        clients (id, name),
        jobs (id, folder_name, client_name),
        quotes (id, quote_number, client_name),
        invoices (id, number, client_name)
      `)
      .eq("id", req.params.id)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Event not found" });
      }
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } catch (err) {
    console.error("Error fetching calendar event:", err);
    res.status(500).json({ error: "Failed to fetch calendar event" });
  }
});

// Create calendar event
app.post("/api/calendar-events", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { 
      title, 
      event_datetime, 
      client_id, 
      related_job_id, 
      related_quote_id, 
      related_invoice_id,
      reminder_datetime,
      notes 
    } = req.body;

    if (!title || !event_datetime) {
      return res.status(400).json({ error: "Title and event datetime are required" });
    }

    console.log("Creating calendar event:", { userId, title, event_datetime, client_id });
    
    const { data, error } = await supabaseAdmin
      .from("calendar_events")
      .insert({
        user_id: userId,
        title,
        event_datetime,
        client_id: client_id || null,
        related_job_id: related_job_id || null,
        related_quote_id: related_quote_id || null,
        related_invoice_id: related_invoice_id || null,
        reminder_datetime: reminder_datetime || null,
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      console.error("Calendar event creation error:", error);
      return res.status(500).json({ 
        error: error.message,
        details: error.details || null,
        hint: error.hint || null,
        code: error.code || null
      });
    }
    console.log("Calendar event created successfully:", { id: data?.id, title: data?.title, event_datetime: data?.event_datetime });
    res.status(201).json(data);
  } catch (err) {
    console.error("Error creating calendar event:", err);
    res.status(500).json({ error: "Failed to create calendar event" });
  }
});

// Update calendar event
app.patch("/api/calendar-events/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const updates = req.body;
    
    const { data, error } = await supabaseAdmin
      .from("calendar_events")
      .update(updates)
      .eq("id", req.params.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error("Error updating calendar event:", err);
    res.status(500).json({ error: "Failed to update calendar event" });
  }
});

// Delete calendar event
app.delete("/api/calendar-events/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { error } = await supabaseAdmin
      .from("calendar_events")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", userId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting calendar event:", err);
    res.status(500).json({ error: "Failed to delete calendar event" });
  }
});

// SYSTEM MESSAGES API

app.get("/api/messages", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { data, error } = await supabaseAdmin
      .from("system_messages")
      .select("*")
      .or(`target_user_id.eq.${userId},is_global.eq.true`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    
    // Transform to expected format and check read status
    const messages = (data || []).map(msg => ({
      id: msg.id,
      title: msg.title,
      content: msg.content,
      message_type: msg.type || 'info',
      is_read: msg.read_by ? msg.read_by.includes(userId) : false,
      created_at: msg.created_at
    }));
    
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.patch("/api/messages/:id/read", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const messageId = req.params.id;

  try {
    // First get the current read_by array
    const { data: message, error: fetchError } = await supabaseAdmin
      .from("system_messages")
      .select("read_by")
      .eq("id", messageId)
      .single();

    if (fetchError) return res.status(500).json({ error: fetchError.message });

    // Add user to read_by array if not already there
    const currentReadBy = message?.read_by || [];
    if (!currentReadBy.includes(userId)) {
      const { error } = await supabaseAdmin
        .from("system_messages")
        .update({ read_by: [...currentReadBy, userId] })
        .eq("id", messageId);

      if (error) return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error marking message as read:", err);
    res.status(500).json({ error: "Failed to mark message as read" });
  }
});

// REFERRALS SUMMARY

// INVITE TRACKING - Generate unique referral codes and track signups
app.post("/api/invites/send", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("referral_code, invites_sent, referral_bonus_days")
      .eq("id", userId)
      .single();

    if (profileErr) return res.status(500).json({ error: profileErr.message });

    const invitesSent = (profile.invites_sent || 0) + 1;
    let bonusDays = profile.referral_bonus_days || 0;

    if (invitesSent === 4) {
      bonusDays += 60;
    }

    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ 
        invites_sent: invitesSent,
        referral_bonus_days: bonusDays
      })
      .eq("id", userId);

    if (updateErr) return res.status(500).json({ error: updateErr.message });

    res.json({ 
      success: true, 
      invites_sent: invitesSent,
      bonus_unlocked: invitesSent === 4 ? 60 : 0
    });
  } catch (error) {
    console.error("Error tracking invite:", error);
    res.status(500).json({ error: "Failed to track invite" });
  }
});

// Get referral stats
app.get("/api/invites/stats", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("invites_sent, referral_bonus_days, referral_code")
      .eq("id", userId)
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const invitesSent = profile.invites_sent || 0;
    let badge = "None";
    if (invitesSent >= 25) badge = "Champion";
    else if (invitesSent >= 10) badge = "Ambassador";
    else if (invitesSent >= 4) badge = "Team Builder";
    else if (invitesSent >= 1) badge = "First Referral";

    res.json({
      invites_sent: invitesSent,
      bonus_days: profile.referral_bonus_days || 0,
      referral_code: profile.referral_code,
      badge: badge
    });
  } catch (error) {
    console.error("Error getting invite stats:", error);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

app.get("/api/referrals/summary", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json({});

  let { data: profile, error: errProf } = await supabaseAdmin
    .from("profiles")
    .select("id, referral_code")
    .eq("id", userId)
    .single();

  if (errProf && errProf.code !== "PGRST116") {
    return res.status(500).json({ error: errProf.message });
  }

  if (!profile) {
    // create bare profile
    const refCode = makeReferralCode(userId);
    const { data: newProf, error: errNew } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, referral_code: refCode })
      .select("id, referral_code")
      .single();

    if (errNew) return res.status(500).json({ error: errNew.message });
    profile = newProf;
  } else if (!profile.referral_code) {
    const refCode = makeReferralCode(userId);
    const { data: upd, error: errUpd } = await supabaseAdmin
      .from("profiles")
      .update({ referral_code: refCode })
      .eq("id", userId)
      .select("id, referral_code")
      .single();

    if (errUpd) return res.status(500).json({ error: errUpd.message });
    profile = upd;
  }

  const { data: earnings, error: errEarn } = await supabaseAdmin
    .from("referral_earnings")
    .select("*")
    .eq("referrer_id", userId);

  if (errEarn) return res.status(500).json({ error: errEarn.message });

  let monthly = 0;
  let lifetime = 0;
  const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

  (earnings || []).forEach((e) => {
    lifetime += e.amount_cents || 0;
    if (e.period === currentPeriod) monthly += e.amount_cents || 0;
  });

  res.json({
    referral_code: profile.referral_code,
    active_referrals: 0,
    monthly_earnings_cents: monthly,
    lifetime_earnings_cents: lifetime,
    referrals: [],
  });
});

// PDF GENERATION HELPER
async function generateInvoicePDF(invoice, profile) {
  const escapeHtml = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const items = invoice.invoice_items || [];
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.description)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.qty || 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${parseFloat(item.unit_price || 0).toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${parseFloat(item.line_total || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const pdfHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; padding: 40px; }
        .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { max-width: 180px; max-height: 60px; margin-bottom: 10px; }
        .business-name { font-size: 24px; font-weight: bold; color: #1f2937; }
        .business-info { font-size: 12px; color: #6b7280; margin-top: 5px; }
        .invoice-title { font-size: 32px; font-weight: bold; color: #2563eb; margin: 20px 0; }
        .meta-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .meta-block { }
        .meta-label { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
        .meta-value { font-size: 14px; color: #1f2937; font-weight: 500; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
        .totals { text-align: right; margin-top: 20px; }
        .totals-row { display: flex; justify-content: flex-end; padding: 8px 0; }
        .totals-label { width: 150px; color: #6b7280; }
        .totals-value { width: 100px; text-align: right; font-weight: 500; }
        .grand-total { font-size: 24px; font-weight: bold; color: #2563eb; border-top: 2px solid #2563eb; padding-top: 15px; margin-top: 10px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        .notes { background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="header">
        ${profile?.logo_url ? `<img src="${profile.logo_url}" class="logo" />` : ''}
        <div class="business-name">${escapeHtml(profile?.business_name || 'Business')}</div>
        <div class="business-info">
          ${profile?.business_address ? escapeHtml(profile.business_address) + '<br>' : ''}
          ${profile?.business_phone ? escapeHtml(profile.business_phone) + ' | ' : ''}
          ${profile?.business_email ? escapeHtml(profile.business_email) : ''}
        </div>
      </div>

      <div class="invoice-title">INVOICE</div>

      <div class="meta-section">
        <div class="meta-block">
          <div class="meta-label">Bill To</div>
          <div class="meta-value" style="font-size: 16px; font-weight: 600;">${escapeHtml(invoice.client_name)}</div>
        </div>
        <div class="meta-block">
          <div class="meta-label">Invoice Number</div>
          <div class="meta-value">#${escapeHtml(invoice.invoice_number)}</div>
          <div class="meta-label" style="margin-top: 10px;">Date</div>
          <div class="meta-value">${new Date(invoice.created_at).toLocaleDateString()}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 50%;">Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span class="totals-label">Subtotal:</span>
          <span class="totals-value">$${parseFloat(invoice.subtotal || 0).toFixed(2)}</span>
        </div>
        ${invoice.tax_amount > 0 ? `
        <div class="totals-row">
          <span class="totals-label">Tax:</span>
          <span class="totals-value">$${parseFloat(invoice.tax_amount || 0).toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="grand-total">
          <span class="totals-label">Total:</span>
          <span class="totals-value">$${parseFloat(invoice.total || 0).toFixed(2)}</span>
        </div>
      </div>

      ${invoice.notes ? `
      <div class="notes">
        <strong>Notes:</strong><br>
        ${escapeHtml(invoice.notes)}
      </div>
      ` : ''}

      <div class="footer">
        <p>Thank you for your business!</p>
        ${invoice.payment_url ? `<p>Pay online: ${invoice.payment_url}</p>` : ''}
      </div>
    </body>
    </html>
  `;

  try {
    const chromiumPath = getChromiumPath();
    if (!chromiumPath) {
      console.error('Chromium not found - PDF generation disabled');
      return null;
    }
    
    const browser = await puppeteer.launch({
      executablePath: chromiumPath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setContent(pdfHtml, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });

    await browser.close();
    return pdfBuffer;
  } catch (error) {
    console.error('PDF generation error:', error);
    return null;
  }
}

// QUOTE PDF GENERATION HELPER
async function generateQuotePDF(quote, profile) {
  const escapeHtml = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const items = quote.quote_items || [];
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.description)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity || 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${parseFloat(item.unit_price || 0).toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${parseFloat(item.total || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const pdfHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; padding: 40px; }
        .header { border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { max-width: 180px; max-height: 60px; margin-bottom: 10px; }
        .business-name { font-size: 24px; font-weight: bold; color: #1f2937; }
        .business-info { font-size: 12px; color: #6b7280; margin-top: 5px; }
        .quote-title { font-size: 32px; font-weight: bold; color: #10b981; margin: 20px 0; }
        .meta-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .meta-block { }
        .meta-label { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
        .meta-value { font-size: 14px; color: #1f2937; font-weight: 500; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
        .totals { text-align: right; margin-top: 20px; }
        .totals-row { display: flex; justify-content: flex-end; padding: 8px 0; }
        .totals-label { width: 150px; color: #6b7280; }
        .totals-value { width: 100px; text-align: right; font-weight: 500; }
        .grand-total { font-size: 24px; font-weight: bold; color: #10b981; border-top: 2px solid #10b981; padding-top: 15px; margin-top: 10px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        .notes { background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 13px; }
        .valid-until { background: #ecfdf5; padding: 10px 15px; border-radius: 6px; margin-top: 15px; color: #047857; font-weight: 500; }
      </style>
    </head>
    <body>
      <div class="header">
        ${profile?.logo_url ? `<img src="${profile.logo_url}" class="logo" />` : ''}
        <div class="business-name">${escapeHtml(profile?.business_name || 'Business')}</div>
        <div class="business-info">
          ${profile?.business_address ? escapeHtml(profile.business_address) + '<br>' : ''}
          ${profile?.business_phone ? escapeHtml(profile.business_phone) + ' | ' : ''}
          ${profile?.business_email ? escapeHtml(profile.business_email) : ''}
        </div>
      </div>

      <div class="quote-title">QUOTE</div>

      <div class="meta-section">
        <div class="meta-block">
          <div class="meta-label">Prepared For</div>
          <div class="meta-value" style="font-size: 16px; font-weight: 600;">${escapeHtml(quote.client_name || 'Client')}</div>
        </div>
        <div class="meta-block">
          <div class="meta-label">Quote Number</div>
          <div class="meta-value">#${escapeHtml(quote.quote_number || quote.id)}</div>
          <div class="meta-label" style="margin-top: 10px;">Date</div>
          <div class="meta-value">${new Date(quote.quote_date || quote.created_at).toLocaleDateString()}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 50%;">Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span class="totals-label">Subtotal:</span>
          <span class="totals-value">$${parseFloat(quote.subtotal || 0).toFixed(2)}</span>
        </div>
        ${quote.tax > 0 ? `
        <div class="totals-row">
          <span class="totals-label">Tax:</span>
          <span class="totals-value">$${parseFloat(quote.tax || 0).toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="grand-total">
          <span class="totals-label">Total:</span>
          <span class="totals-value">$${parseFloat(quote.total || 0).toFixed(2)}</span>
        </div>
      </div>

      ${quote.notes ? `
      <div class="notes">
        <strong>Notes:</strong><br>
        ${escapeHtml(quote.notes)}
      </div>
      ` : ''}

      ${quote.valid_until ? `
      <div class="valid-until">
        Quote valid until: ${new Date(quote.valid_until).toLocaleDateString()}
      </div>
      ` : ''}

      <div class="footer">
        <p>Thank you for considering our services!</p>
        <p>This is a quote and not an invoice. Prices are subject to change.</p>
      </div>
    </body>
    </html>
  `;

  try {
    const chromiumPath = getChromiumPath();
    if (!chromiumPath) {
      console.error('Chromium not found - Quote PDF generation disabled');
      return null;
    }
    
    const browser = await puppeteer.launch({
      executablePath: chromiumPath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setContent(pdfHtml, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });

    await browser.close();
    return pdfBuffer;
  } catch (error) {
    console.error('Quote PDF generation error:', error);
    return null;
  }
}

// RESEND EMAIL HELPER
async function getResendClient() {
  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (!xReplitToken || !hostname) {
      return null;
    }

    const connectionSettings = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    ).then(res => res.json()).then(data => data.items?.[0]);

    if (!connectionSettings || !connectionSettings.settings.api_key) {
      return null;
    }
    
    return {
      client: new Resend(connectionSettings.settings.api_key),
      fromEmail: connectionSettings.settings.from_email
    };
  } catch (error) {
    console.error("Resend client error:", error);
    return null;
  }
}

// SEND SIGNUP CONFIRMATION EMAIL
app.post("/api/send-signup-confirmation", async (req, res) => {
  try {
    const { email, userId } = req.body;
    if (!email || !userId) {
      return res.status(400).json({ error: "Email and userId are required" });
    }

    // Get Resend client
    const resendConnection = await getResendClient();
    if (!resendConnection) {
      return res.status(503).json({ error: "Email service is not configured" });
    }
    const { client: resend, fromEmail } = resendConnection;

    // Generate confirmation link - use production domain for emails
    const confirmationLink = `https://trade-base.biz/confirm-signup?userId=${userId}&email=${encodeURIComponent(email)}`;

    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { border: 1px solid #ddd; border-radius: 8px; padding: 30px; background: #f9f9f9; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #2563eb; margin: 0; font-size: 28px; }
          .content { line-height: 1.8; color: #555; }
          .button-container { text-align: center; margin: 30px 0; }
          .button { background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; }
          .button:hover { background: #1d4ed8; }
          .footer { border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #888; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to TradeBase!</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>Thanks for signing up for TradeBase, the invoicing app built for tradespeople. We're excited to have you on board!</p>
            <p>To complete your signup and get started, please confirm your email address by clicking the button below:</p>
            <div class="button-container">
              <a href="${confirmationLink}" class="button">Confirm Email Address</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 12px;"><a href="${confirmationLink}">${confirmationLink}</a></p>
            <p>This link will expire in 24 hours.</p>
            <p>Questions? We're here to help.</p>
          </div>
          <div class="footer">
            <p>© 2025 TradeBase. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Confirm Your TradeBase Account",
      html: emailBody
    });

    if (emailError) {
      console.error("Email send error:", emailError);
      return res.status(500).json({ error: "Failed to send confirmation email" });
    }

    res.json({ success: true, message: "Confirmation email sent" });
  } catch (error) {
    console.error("Signup confirmation error:", error);
    res.status(500).json({ error: "Failed to send confirmation email" });
  }
});

// SEND INVOICE EMAIL
app.post("/api/invoices/:id/send-email", requireSubscription, async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail, recipientName } = req.body;

    console.log(`[SEND EMAIL] Invoice ID: ${id}, User ID: ${req.userId}, Email: ${recipientEmail}`);

    if (!recipientEmail) {
      return res.status(400).json({ error: "Recipient email is required" });
    }

    // Get invoice (without joins - fetch items separately for compatibility)
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("user_id", req.userId)
      .single();

    if (invoiceError || !invoice) {
      console.log(`[SEND EMAIL] Invoice not found. Error: ${invoiceError?.message}`);
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Fetch invoice items separately
    const { data: invoiceItems } = await supabaseAdmin
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id);
    
    invoice.invoice_items = invoiceItems || [];

    // Fetch attachments separately
    const { data: invoiceAttachments } = await supabaseAdmin
      .from("invoice_attachments")
      .select("*")
      .eq("invoice_id", id);
    
    invoice.invoice_attachments = invoiceAttachments || [];

    console.log(`[SEND EMAIL] Invoice found with ${invoice.invoice_items.length} items`);

    // Get user profile for business info and template preference
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("business_name, business_email, business_phone, business_address, logo_url, preferred_template")
      .eq("id", req.userId)
      .single();

    // Get Resend client
    const resendConnection = await getResendClient();
    if (!resendConnection) {
      return res.status(503).json({ error: "Email service is not configured. Please contact support." });
    }
    const { client: resend, fromEmail } = resendConnection;

    // Escape HTML to prevent XSS injection in emails
    const escapeHtml = (text) => {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };
    
    // Sanitize for email subject/filename (remove special chars, allow only alphanumeric, space, dash, underscore)
    const sanitizeForMetadata = (text) => {
      if (!text) return '';
      return String(text).replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
    };
    
    // Generate email subject (plain text - sanitize to prevent control character injection)
    const businessNameSafe = sanitizeForMetadata(profile?.business_name || "Business");
    const invoiceNumberSafe = sanitizeForMetadata(invoice.invoice_number);
    const subject = `Invoice #${invoiceNumberSafe} from ${businessNameSafe}`;
    
    // For HTML display, use proper HTML escaping
    const businessName = escapeHtml(profile?.business_name || "Business");

    // Generate email HTML body
    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: 600; color: #6b7280; }
          .total { font-size: 1.5rem; font-weight: bold; color: #2563eb; }
          .footer { text-align: center; color: #6b7280; font-size: 0.875rem; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Invoice from ${businessName}</h1>
        </div>
        <div class="content">
          <p>Hi ${escapeHtml(recipientName || 'there')},</p>
          <p>Please find your invoice details below.</p>
          
          <div class="invoice-details">
            <div class="detail-row">
              <span class="detail-label">Invoice Number:</span>
              <span>#${escapeHtml(invoice.invoice_number)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span>${new Date(invoice.created_at).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Client:</span>
              <span>${escapeHtml(invoice.client_name)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total Amount:</span>
              <span class="total">$${invoice.total.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span style="color: ${invoice.payment_status === 'paid' ? '#10b981' : invoice.payment_status === 'pending' ? '#f59e0b' : '#ef4444'};">
                ${escapeHtml(invoice.payment_status.charAt(0).toUpperCase() + invoice.payment_status.slice(1))}
              </span>
            </div>
          </div>

          ${invoice.payment_url ? `
            <p style="text-align: center;">
              <a href="${escapeHtml(invoice.payment_url)}" class="button">Pay Invoice Online</a>
            </p>
          ` : ''}

          <p>If you have any questions about this invoice, please contact us:</p>
          <p>
            ${profile?.business_email ? `<strong>Email:</strong> ${escapeHtml(profile.business_email)}<br>` : ''}
            ${profile?.business_phone ? `<strong>Phone:</strong> ${escapeHtml(profile.business_phone)}<br>` : ''}
            ${profile?.business_address ? `<strong>Address:</strong> ${escapeHtml(profile.business_address)}` : ''}
          </p>

          <div class="footer">
            <p>This is an automated email from ${businessName}.</p>
            <p>Thank you for your business!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Generate PDF attachment
    console.log('[SEND EMAIL] Generating PDF...');
    const pdfBuffer = await generateInvoicePDF(invoice, profile);
    console.log('[SEND EMAIL] PDF generated:', pdfBuffer ? `${pdfBuffer.length} bytes` : 'FAILED');
    
    // Prepare email options
    const emailOptions = {
      from: fromEmail,
      to: recipientEmail,
      subject: subject,
      html: emailBody,
    };
    
    // Add PDF attachment if generated successfully
    if (pdfBuffer) {
      emailOptions.attachments = [{
        filename: `Invoice-${invoice.invoice_number || invoice.id}.pdf`,
        content: pdfBuffer
      }];
      console.log('[SEND EMAIL] PDF attachment added');
    } else {
      console.log('[SEND EMAIL] No PDF attachment - generation failed');
    }

    // Send email via Resend
    const { data: emailResult, error: emailError } = await resend.emails.send(emailOptions);

    if (emailError) {
      console.error("Email send error:", emailError);
      return res.status(500).json({ error: "Failed to send email. Please try again later." });
    }

    // Update invoice to mark as sent
    await supabaseAdmin
      .from("invoices")
      .update({ 
        sent_at: new Date().toISOString(),
        sent_to: recipientEmail
      })
      .eq("id", id);

    res.json({ 
      success: true, 
      message: "Invoice sent successfully",
      emailId: emailResult.id 
    });

  } catch (error) {
    console.error("Send invoice error:", error);
    res.status(500).json({ error: "Failed to send invoice email" });
  }
});

// ADMIN ENDPOINTS

// Check if user is admin
app.get("/api/admin/check", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Also check environment variable for admin emails
    let isEnvAdmin = false;
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(e => e);
    
    if (adminEmails.length > 0) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const userEmail = (authUser?.user?.email || "").toLowerCase();
      isEnvAdmin = adminEmails.includes(userEmail);
      
      // Auto-set is_admin in DB if in env list
      if (isEnvAdmin && !profile?.is_admin) {
        await supabaseAdmin.from("profiles").update({ is_admin: true }).eq("id", userId);
      }
    }

    res.json({ is_admin: profile?.is_admin || isEnvAdmin });
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ error: "Failed to check admin status" });
  }
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) return res.status(500).json({ error: error.message });

    const userList = users.users.slice(0, 50).map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at
    }));

    res.json(userList);
  } catch (error) {
    console.error("Error listing users:", error);
    res.status(500).json({ error: "Failed to list users" });
  }
});

app.post("/api/admin/send-message", requireAdmin, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { title, content, message_type, target_users } = req.body;

  try {
    const messages = target_users && target_users.length
      ? target_users.map(uid => ({ target_user_id: uid, title, content, type: message_type, is_global: false }))
      : [{ target_user_id: null, title, content, type: message_type, is_global: true }];

    const { error } = await supabaseAdmin
      .from("system_messages")
      .insert(messages);

    if (error) {
      console.error("Error inserting system message:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error sending admin message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

app.post("/api/admin/enable-ai", requireAdmin, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { target_user_id, enabled } = req.body;

  try {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ 
        ai_enabled: enabled !== false, 
        ai_plan: enabled !== false ? 'admin_granted' : null 
      })
      .eq("id", target_user_id);

    if (error) {
      console.error("Error updating AI status:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, ai_enabled: enabled !== false });
  } catch (error) {
    console.error("Error enabling AI:", error);
    res.status(500).json({ error: "Failed to enable AI" });
  }
});

app.post("/api/admin/grant-lifetime", requireAdmin, async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Find user by email in auth
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update their profile to lifetime
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ 
        subscription_status: "active",
        subscription_plan: "lifetime_early",
        trial_ends_at: null,
        subscription_ends_at: null
      })
      .eq("id", user.id);

    if (error) {
      console.error("Error granting lifetime:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: `Lifetime membership granted to ${email}` });
  } catch (error) {
    console.error("Error granting lifetime:", error);
    res.status(500).json({ error: "Failed to grant lifetime membership" });
  }
});

// AI SUBSCRIPTION ENDPOINTS

// Check AI subscription status with usage info
app.get("/api/ai/status", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("ai_enabled, ai_plan, ai_subscription_id, ai_actions_used, ai_actions_limit, ai_billing_cycle_start")
      .eq("id", userId)
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Calculate billing cycle reset date
    const cycleStart = new Date(profile?.ai_billing_cycle_start || Date.now());
    const now = new Date();
    const monthsPassed = (now.getFullYear() - cycleStart.getFullYear()) * 12 + (now.getMonth() - cycleStart.getMonth());
    
    let actionsUsed = profile?.ai_actions_used || 0;
    let billingCycleStart = cycleStart;
    
    // Reset if billing cycle has passed
    if (monthsPassed >= 1 && profile?.ai_enabled) {
      actionsUsed = 0;
      billingCycleStart = now;
      await supabaseAdmin
        .from("profiles")
        .update({
          ai_actions_used: 0,
          ai_billing_cycle_start: now.toISOString()
        })
        .eq("id", userId);
    }

    const resetDate = new Date(billingCycleStart);
    resetDate.setMonth(resetDate.getMonth() + 1);

    res.json({
      ai_enabled: profile?.ai_enabled || false,
      ai_plan: profile?.ai_plan || null,
      has_subscription: !!profile?.ai_subscription_id,
      usage: {
        actions_used: actionsUsed,
        actions_limit: profile?.ai_actions_limit || 300,
        reset_date: resetDate.toISOString(),
        warning_threshold: 250,
        is_at_limit: actionsUsed >= (profile?.ai_actions_limit || 300),
        is_warning: actionsUsed >= 250 && actionsUsed < (profile?.ai_actions_limit || 300)
      }
    });
  } catch (error) {
    console.error("Error checking AI status:", error);
    res.status(500).json({ error: "Failed to check AI status" });
  }
});

// ============================================================================
// UNIFIED VOICE COMMAND ENDPOINT
// One brain, one system - handles all voice commands with function calling
// ============================================================================

// AI Model Configuration (server-side)
const AI_MODELS = {
  transcription: process.env.AI_TRANSCRIPTION_MODEL || "whisper-1",
  chat: process.env.AI_CHAT_MODEL || "gpt-4o-mini",
  temperature: parseFloat(process.env.AI_TEMPERATURE) || 0,
  maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 1024
};

// Tool definitions for function calling
const VOICE_COMMAND_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_client",
      description: "Create a new client/customer in the system",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Full name of the client (first and last name)" },
          phone: { type: "string", description: "Phone number (optional)" },
          email: { type: "string", description: "Email address (optional)" },
          address: { type: "string", description: "Street address (optional)" },
          notes: { type: "string", description: "Additional notes (optional)" }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_inventory_item",
      description: "Add an item to inventory",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the inventory item" },
          quantity: { type: "number", description: "Quantity to add (default 1)" },
          unit_price: { type: "number", description: "Price per unit in dollars" },
          category: { 
            type: "string", 
            description: "Category of the item",
            enum: ["Electrical", "Plumbing", "HVAC", "Tools", "Materials", "Other"]
          },
          notes: { type: "string", description: "Additional notes (optional)" }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_quote",
      description: "Create a quote/estimate for a client",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Name of the client" },
          address: { type: "string", description: "Job address (optional)" },
          job_type: { type: "string", description: "Type of job (e.g., 'Electrical work', 'Plumbing repair')" },
          line_items: {
            type: "array",
            description: "List of items/services in the quote",
            items: {
              type: "object",
              properties: {
                description: { type: "string", description: "Brief service/item description" },
                quantity: { type: "number", description: "Quantity (default 1)" },
                unit_price: { type: "number", description: "Price per unit in dollars" }
              },
              required: ["description", "unit_price"]
            }
          },
          notes: { type: "string", description: "Additional notes (optional)" }
        },
        required: ["client_name", "line_items"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_invoice",
      description: "Create an invoice for a client",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Name of the client" },
          address: { type: "string", description: "Job address (optional)" },
          line_items: {
            type: "array",
            description: "List of items/services in the invoice",
            items: {
              type: "object",
              properties: {
                description: { type: "string", description: "Brief service/item description" },
                quantity: { type: "number", description: "Quantity (default 1)" },
                unit_price: { type: "number", description: "Price per unit in dollars" }
              },
              required: ["description", "unit_price"]
            }
          },
          notes: { type: "string", description: "Additional notes (optional)" }
        },
        required: ["client_name", "line_items"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Create a calendar event, reminder, or schedule an appointment",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the event or reminder" },
          event_datetime: { type: "string", description: "Date and time for the event in ISO format (e.g., 2024-12-15T10:00:00). If only a date is mentioned, use 9:00 AM as default time." },
          client_name: { type: "string", description: "Name of the client this event is for (optional)" },
          notes: { type: "string", description: "Additional details or notes (optional)" }
        },
        required: ["title", "event_datetime"]
      }
    }
  }
];

// Execute a single tool call
async function executeVoiceToolCall(toolName, args, userId) {
  switch (toolName) {
    case "create_client": {
      const { name, phone = "", email = "", address = "", notes = "" } = args;
      
      const { data, error } = await supabaseAdmin
        .from("clients")
        .insert({
          user_id: userId,
          name,
          phone,
          email,
          address,
          notes
        })
        .select()
        .single();
      
      if (error) throw new Error(`Failed to create client: ${error.message}`);
      
      return {
        type: "create_client",
        success: true,
        data: data,
        summary: `Created client "${name}"${phone ? ` (${phone})` : ""}`
      };
    }
    
    case "add_inventory_item": {
      const { name, quantity = 1, unit_price = 0, category = "Other" } = args;
      
      // Check if item already exists to potentially stack
      const { data: existing } = await supabaseAdmin
        .from("inventory_items")
        .select("*")
        .eq("user_id", userId)
        .ilike("name", name)
        .single();
      
      let data;
      if (existing) {
        // Stack onto existing item
        const newQuantity = (existing.quantity || 0) + quantity;
        const { data: updated, error } = await supabaseAdmin
          .from("inventory_items")
          .update({ 
            quantity: newQuantity,
            unit_price: unit_price || existing.unit_price
          })
          .eq("id", existing.id)
          .select()
          .single();
        
        if (error) throw new Error(`Failed to update inventory: ${error.message}`);
        data = updated;
        
        return {
          type: "add_inventory_item",
          success: true,
          data: data,
          summary: `Added ${quantity} "${name}" to inventory (now ${newQuantity} total)`
        };
      } else {
        // Create new item
        const { data: created, error } = await supabaseAdmin
          .from("inventory_items")
          .insert({
            user_id: userId,
            name,
            quantity,
            unit_price,
            category
          })
          .select()
          .single();
        
        if (error) throw new Error(`Failed to add inventory: ${error.message}`);
        data = created;
        
        return {
          type: "add_inventory_item",
          success: true,
          data: data,
          summary: `Added ${quantity} "${name}" to inventory at $${unit_price} each`
        };
      }
    }
    
    case "create_quote": {
      const { client_name, address = "", job_type = "", line_items = [], notes = "" } = args;
      
      // First, find or create the client
      let clientId = null;
      const { data: existingClient } = await supabaseAdmin
        .from("clients")
        .select("id")
        .eq("user_id", userId)
        .ilike("name", client_name)
        .single();
      
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // Create the client
        const { data: newClient, error: clientError } = await supabaseAdmin
          .from("clients")
          .insert({
            user_id: userId,
            name: client_name,
            address: address
          })
          .select()
          .single();
        
        if (clientError) throw new Error(`Failed to create client: ${clientError.message}`);
        clientId = newClient.id;
      }
      
      // Calculate totals
      const subtotal = line_items.reduce((sum, item) => {
        return sum + (item.quantity || 1) * (item.unit_price || 0);
      }, 0);
      const tax = 0;
      const total = subtotal + tax;
      
      // Create the quote
      const quoteNumber = `QT-${Date.now()}`;
      const { data: quote, error: quoteError } = await supabaseAdmin
        .from("quotes")
        .insert({
          user_id: userId,
          client_id: clientId,
          client_name: client_name,
          quote_number: quoteNumber,
          issue_date: new Date().toISOString().split("T")[0],
          notes,
          subtotal,
          tax_amount: tax,
          total,
          status: "draft",
          template: "basic_clean"
        })
        .select()
        .single();
      
      if (quoteError) throw new Error(`Failed to create quote: ${quoteError.message}`);
      
      // Add line items
      if (line_items.length > 0) {
        const items = line_items.map(item => ({
          quote_id: quote.id,
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0
        }));
        
        await supabaseAdmin.from("quote_items").insert(items);
      }
      
      // Create job folder
      const folderName = `${client_name}_${address || "NoAddress"}_${new Date().toISOString().split("T")[0]}_${job_type || "Quote"}`.replace(/[^a-zA-Z0-9_-]/g, "_");
      await supabaseAdmin.from("jobs").insert({
        user_id: userId,
        client_name,
        address,
        job_type: job_type || "Quote",
        folder_name: folderName,
        status: "pending"
      });
      
      return {
        type: "create_quote",
        success: true,
        data: quote,
        summary: `Created quote ${quoteNumber} for ${client_name} - $${total.toFixed(2)}`
      };
    }
    
    case "create_invoice": {
      const { client_name, address = "", line_items = [], notes = "" } = args;
      
      // First, find or create the client using direct SQL
      let clientId = null;
      const { rows: existingClients } = await pgPool.query(
        `SELECT id FROM clients WHERE user_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
        [userId, client_name]
      );
      
      if (existingClients.length > 0) {
        clientId = existingClients[0].id;
      } else {
        const { rows: newClients } = await pgPool.query(
          `INSERT INTO clients (user_id, name, address) VALUES ($1, $2, $3) RETURNING id`,
          [userId, client_name, address]
        );
        clientId = newClients[0].id;
      }
      
      // Calculate totals
      const subtotal = line_items.reduce((sum, item) => {
        return sum + (item.quantity || 1) * (item.unit_price || 0);
      }, 0);
      const tax = 0;
      const total = subtotal + tax;
      
      // Generate invoice number: INV-YYYYMMDD-XXX (consistent with main API)
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const { rows: countRows } = await pgPool.query(
        `SELECT COUNT(*) as cnt FROM invoices WHERE user_id = $1 AND invoice_number LIKE $2`,
        [userId, `INV-${dateStr}-%`]
      );
      const seqNum = (parseInt(countRows[0].cnt) + 1).toString().padStart(3, '0');
      const invoiceNumber = `INV-${dateStr}-${seqNum}`;
      
      // Create the invoice using direct SQL (bypasses Supabase schema cache issues)
      const { rows: invoices } = await pgPool.query(
        `INSERT INTO invoices (user_id, client_id, client_address, invoice_number, issue_date, notes, subtotal, tax_amount, total, status, payment_status, template)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [userId, clientId, address, invoiceNumber, new Date().toISOString().split("T")[0], notes, subtotal, tax, total, "draft", "unpaid", "basic_clean"]
      );
      
      const invoice = invoices[0];
      
      // Add line items using direct SQL
      if (line_items.length > 0) {
        for (const item of line_items) {
          const qty = item.quantity || 1;
          const unitPrice = item.unit_price || 0;
          const itemTotal = qty * unitPrice;
          await pgPool.query(
            `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES ($1, $2, $3, $4, $5)`,
            [invoice.id, item.description, qty, unitPrice, itemTotal]
          );
        }
      }
      
      return {
        type: "create_invoice",
        success: true,
        data: invoice,
        summary: `Created invoice ${invoiceNumber} for ${client_name} - $${total.toFixed(2)}`
      };
    }
    
    case "create_calendar_event": {
      const { title, event_datetime, client_name = "", notes = "" } = args;
      
      // Optionally find client if provided
      let clientId = null;
      if (client_name) {
        const { data: existingClient } = await supabaseAdmin
          .from("clients")
          .select("id")
          .eq("user_id", userId)
          .ilike("name", client_name)
          .single();
        
        if (existingClient) {
          clientId = existingClient.id;
        }
      }
      
      const { data: event, error: eventError } = await supabaseAdmin
        .from("calendar_events")
        .insert({
          user_id: userId,
          title,
          event_datetime,
          client_id: clientId,
          notes
        })
        .select()
        .single();
      
      if (eventError) throw new Error(`Failed to create calendar event: ${eventError.message}`);
      
      const eventDate = new Date(event_datetime);
      const dateStr = eventDate.toLocaleDateString("en-US", { 
        weekday: "short", 
        month: "short", 
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
      
      return {
        type: "create_calendar_event",
        success: true,
        data: event,
        summary: `Created calendar event "${title}" for ${dateStr}`
      };
    }
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// In-memory store for pending action previews (in production, use Redis or DB)
const pendingActionPreviews = new Map();

// Generate human-readable preview for an action
function generateActionPreview(toolName, args) {
  switch (toolName) {
    case "create_client":
      return {
        icon: "👤",
        title: "Add Client",
        description: `${args.name}${args.phone ? ` (${args.phone})` : ""}${args.email ? ` - ${args.email}` : ""}`,
        risky: false
      };
    case "add_inventory_item":
      return {
        icon: "📦",
        title: "Add Inventory",
        description: `${args.quantity || 1}× ${args.name}${args.unit_price ? ` @ $${args.unit_price}` : ""}`,
        risky: false
      };
    case "create_quote":
      const quoteTotal = (args.line_items || []).reduce((sum, i) => sum + (i.quantity || 1) * (i.unit_price || 0), 0);
      return {
        icon: "📋",
        title: "Create Quote",
        description: `$${quoteTotal.toFixed(2)} for ${args.client_name}`,
        risky: false
      };
    case "create_invoice":
      const invTotal = (args.line_items || []).reduce((sum, i) => sum + (i.quantity || 1) * (i.unit_price || 0), 0);
      return {
        icon: "🧾",
        title: "Create Invoice",
        description: `$${invTotal.toFixed(2)} for ${args.client_name}`,
        risky: false
      };
    case "create_calendar_event":
      const eventDate = new Date(args.event_datetime);
      const dateStr = eventDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      return {
        icon: "📅",
        title: "Calendar Event",
        description: `${args.title} - ${dateStr}`,
        risky: false
      };
    default:
      return {
        icon: "⚡",
        title: toolName,
        description: JSON.stringify(args),
        risky: false
      };
  }
}

// Log action to activity_logs table
async function logActivityAction(userId, actionSetId, action) {
  try {
    await supabaseAdmin.from("activity_logs").insert({
      user_id: userId,
      action_set_id: actionSetId,
      action_type: action.type,
      action_data: action.data || {},
      entity_id: action.data?.id || null,
      entity_type: action.type.replace("create_", "").replace("add_", ""),
      summary: action.summary
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

// Main voice command endpoint - now with preview mode
app.post("/api/voice-command", requireAI, upload.single("audio"), async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "AI service not configured" });
    }

    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Check if this is preview mode (default: true for safety)
    const previewMode = req.body.preview !== "false" && req.body.preview !== false;
    
    let transcript = req.body.transcript;
    
    // If audio file provided, transcribe it first
    if (req.file && !transcript) {
      // Note: Usage is only counted when action is confirmed/executed, not during transcription
      
      const fs = await import("fs");
      const path = await import("path");
      const os = await import("os");
      
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `voice_cmd_${Date.now()}.webm`);
      fs.writeFileSync(tempFile, req.file.buffer);
      
      try {
        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(tempFile),
          model: AI_MODELS.transcription
        });
        transcript = filter.clean(transcription.text);
        fs.unlinkSync(tempFile);
      } catch (transcribeError) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
        throw transcribeError;
      }
    }
    
    if (!transcript) {
      return res.status(400).json({ error: "No audio or transcript provided" });
    }

    console.log("Voice command transcript:", transcript);
    
    // Note: Usage is only counted when action is confirmed/executed, not during parsing

    // Use function calling to determine intent and extract data
    const systemPrompt = `You are a voice command assistant for a contractor/tradesperson app. Parse the user's spoken command and call the appropriate function(s).

CRITICAL: ALWAYS CALL MULTIPLE FUNCTIONS WHEN REQUESTED
- "create invoice for John and add fans to inventory" = create_invoice + add_inventory_item (BOTH!)
- "add 10 PVC pipes and create quote for Mike" = add_inventory_item + create_quote (BOTH!)
- "add client Bob and 5 copper fittings to inventory" = create_client + add_inventory_item (BOTH!)

IMPORTANT RULES:
1. If the user mentions MULTIPLE actions (using "and", "also", "then"), call ALL appropriate functions
2. Extract names, amounts, quantities accurately
3. For prices, convert spoken amounts to numbers (e.g., "four fifty" = 450, "two dollars" = 2)
4. Be smart about context - "2 fans at 450" means quantity=2, unit_price=450
5. For inventory: "add 5 fans" or "add fans to inventory" = add_inventory_item
6. For invoices: "create invoice" or "bill" = create_invoice
7. For quotes: "create quote" or "estimate" = create_quote

Today's date is: ${new Date().toISOString().split("T")[0]}`;

    const completion = await openai.chat.completions.create({
      model: AI_MODELS.chat,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcript }
      ],
      tools: VOICE_COMMAND_TOOLS,
      tool_choice: "auto",
      temperature: AI_MODELS.temperature,
      max_tokens: AI_MODELS.maxTokens
    });

    const message = completion.choices[0].message;
    const toolCalls = message.tool_calls || [];
    
    if (toolCalls.length === 0) {
      return res.json({
        status: "no_action",
        transcript,
        message: "I didn't understand what you wanted to do. Try saying something like 'Add client John Smith' or 'Create quote for 2 fans at 450'.",
        actions: []
      });
    }

    // Parse all planned actions
    const plannedActions = toolCalls.map(toolCall => {
      const args = JSON.parse(toolCall.function.arguments);
      const preview = generateActionPreview(toolCall.function.name, args);
      return {
        toolName: toolCall.function.name,
        args,
        preview
      };
    });

    // PREVIEW MODE: Return planned actions for user confirmation
    if (previewMode) {
      const previewId = `preview_${userId}_${Date.now()}`;
      
      // Store pending actions (expires in 5 minutes)
      pendingActionPreviews.set(previewId, {
        userId,
        transcript,
        actions: plannedActions,
        expiresAt: Date.now() + 5 * 60 * 1000
      });
      
      // Clean up expired previews
      for (const [key, value] of pendingActionPreviews.entries()) {
        if (value.expiresAt < Date.now()) {
          pendingActionPreviews.delete(key);
        }
      }
      
      return res.json({
        status: "preview",
        previewId,
        transcript,
        plannedActions: plannedActions.map(a => ({
          type: a.toolName,
          args: a.args,
          ...a.preview
        }))
      });
    }

    // EXECUTE MODE: Run all actions immediately
    const actionSetId = crypto.randomUUID ? crypto.randomUUID() : `set_${Date.now()}`;
    const actions = [];
    
    for (const planned of plannedActions) {
      try {
        console.log(`Executing ${planned.toolName}:`, planned.args);
        
        const result = await executeVoiceToolCall(planned.toolName, planned.args, userId);
        actions.push(result);
        
        // Log to activity log
        await logActivityAction(userId, actionSetId, result);
      } catch (execError) {
        console.error(`Tool execution error for ${planned.toolName}:`, execError);
        actions.push({
          type: planned.toolName,
          success: false,
          error: execError.message,
          summary: `Failed: ${execError.message}`
        });
      }
    }

    // Get updated usage info to return to frontend
    const usage = await getAIUsageInfo(userId);

    res.json({
      status: "ok",
      actionSetId,
      transcript,
      actions,
      usage
    });

  } catch (error) {
    console.error("Voice command error:", error);
    res.status(500).json({ 
      error: "Failed to process voice command",
      details: error.message 
    });
  }
});

// Confirm and execute previewed actions
app.post("/api/voice-command/confirm", requireAI, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { previewId } = req.body;
    
    if (!previewId) {
      return res.status(400).json({ error: "Preview ID required" });
    }
    
    const pending = pendingActionPreviews.get(previewId);
    
    if (!pending) {
      return res.status(404).json({ error: "Preview expired or not found. Please try again." });
    }
    
    if (pending.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    if (pending.expiresAt < Date.now()) {
      pendingActionPreviews.delete(previewId);
      return res.status(410).json({ error: "Preview expired. Please try again." });
    }
    
    // Execute all planned actions
    const actionSetId = crypto.randomUUID ? crypto.randomUUID() : `set_${Date.now()}`;
    const actions = [];
    
    let successfulActions = 0;
    
    for (const planned of pending.actions) {
      try {
        console.log(`Confirming ${planned.toolName}:`, planned.args);
        
        const result = await executeVoiceToolCall(planned.toolName, planned.args, userId);
        actions.push(result);
        
        // Log to activity log
        await logActivityAction(userId, actionSetId, result);
        
        // Track successful action for usage counting
        if (result.success) {
          successfulActions++;
        }
      } catch (execError) {
        console.error(`Tool execution error for ${planned.toolName}:`, execError);
        actions.push({
          type: planned.toolName,
          success: false,
          error: execError.message,
          summary: `Failed: ${execError.message}`
        });
      }
    }
    
    // Remove the pending preview
    pendingActionPreviews.delete(previewId);
    
    // Increment AI usage counter for successful actions
    if (successfulActions > 0) {
      for (let i = 0; i < successfulActions; i++) {
        await logAIUsage(userId, "voice_action_executed");
      }
    }
    
    // Get updated usage info to return to frontend
    const usage = await getAIUsageInfo(userId);

    res.json({
      status: "ok",
      actionSetId,
      transcript: pending.transcript,
      actions,
      usage
    });
    
  } catch (error) {
    console.error("Confirm voice command error:", error);
    res.status(500).json({ error: "Failed to execute actions" });
  }
});

// Get activity log / receipts
app.get("/api/activity-log", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const { data, error } = await supabaseAdmin
      .from("activity_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    
    if (error) return res.status(500).json({ error: error.message });
    
    res.json(data || []);
  } catch (err) {
    console.error("Error fetching activity log:", err);
    res.status(500).json({ error: "Failed to fetch activity log" });
  }
});

// Undo last action set
app.post("/api/activity-log/undo", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { actionSetId } = req.body;
    
    // Get the most recent action set if not specified
    let targetSetId = actionSetId;
    
    if (!targetSetId) {
      const { data: recent } = await supabaseAdmin
        .from("activity_logs")
        .select("action_set_id")
        .eq("user_id", userId)
        .eq("is_undone", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (!recent) {
        return res.status(404).json({ error: "No actions to undo" });
      }
      targetSetId = recent.action_set_id;
    }
    
    // Get all actions in this set
    const { data: actionsToUndo, error: fetchError } = await supabaseAdmin
      .from("activity_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("action_set_id", targetSetId)
      .eq("is_undone", false);
    
    if (fetchError) return res.status(500).json({ error: fetchError.message });
    
    if (!actionsToUndo || actionsToUndo.length === 0) {
      return res.status(404).json({ error: "No actions to undo or already undone" });
    }
    
    const undoResults = [];
    
    // Undo each action (delete the created entities)
    for (const action of actionsToUndo) {
      try {
        const entityId = action.entity_id;
        if (!entityId) continue;
        
        switch (action.action_type) {
          case "create_client":
            await supabaseAdmin.from("clients").delete().eq("id", entityId).eq("user_id", userId);
            undoResults.push({ type: action.action_type, success: true, summary: `Removed client` });
            break;
          case "add_inventory_item":
            await supabaseAdmin.from("inventory_items").delete().eq("id", entityId).eq("user_id", userId);
            undoResults.push({ type: action.action_type, success: true, summary: `Removed inventory item` });
            break;
          case "create_quote":
            await supabaseAdmin.from("quote_items").delete().eq("quote_id", entityId);
            await supabaseAdmin.from("quotes").delete().eq("id", entityId).eq("user_id", userId);
            undoResults.push({ type: action.action_type, success: true, summary: `Removed quote` });
            break;
          case "create_invoice":
            await supabaseAdmin.from("invoice_items").delete().eq("invoice_id", entityId);
            await supabaseAdmin.from("invoices").delete().eq("id", entityId).eq("user_id", userId);
            undoResults.push({ type: action.action_type, success: true, summary: `Removed invoice` });
            break;
          case "create_calendar_event":
            await supabaseAdmin.from("calendar_events").delete().eq("id", entityId).eq("user_id", userId);
            undoResults.push({ type: action.action_type, success: true, summary: `Removed calendar event` });
            break;
        }
      } catch (undoErr) {
        console.error(`Failed to undo ${action.action_type}:`, undoErr);
        undoResults.push({ type: action.action_type, success: false, error: undoErr.message });
      }
    }
    
    // Mark actions as undone
    await supabaseAdmin
      .from("activity_logs")
      .update({ is_undone: true })
      .eq("action_set_id", targetSetId)
      .eq("user_id", userId);
    
    res.json({
      status: "ok",
      actionSetId: targetSetId,
      undoResults
    });
    
  } catch (error) {
    console.error("Undo error:", error);
    res.status(500).json({ error: "Failed to undo actions" });
  }
});

// VOICE TRANSCRIPTION - Convert audio to text using OpenAI (REQUIRES AI SUBSCRIPTION)
app.post("/api/voice-transcribe", requireAI, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  // Log AI usage
  await logAIUsage(userId, "voice_transcription");

  const { voice_note_id, audio_url } = req.body;

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Transcription service not configured" });
    }

    const openai = new (await import("openai")).default({
      apiKey: process.env.OPENAI_API_KEY
    });

    const audioBuffer = await fetch(audio_url).then(r => r.arrayBuffer());
    const audioBlob = new Blob([audioBuffer], { type: "audio/wav" });

    const transcription = await openai.audio.transcriptions.create({
      file: audioBlob,
      model: "whisper-1"
    });

    const { error: updateErr } = await supabaseAdmin
      .from("voice_notes")
      .update({ transcript: transcription.text })
      .eq("id", voice_note_id);

    if (updateErr) return res.status(500).json({ error: updateErr.message });

    res.json({ transcript: transcription.text });
  } catch (error) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
});

// AI TRANSCRIBE FOR QUOTE/INVOICE - Convert audio blob to transcript using Whisper
app.post("/api/ai/transcribe", requireAI, upload.single("audio"), async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  await logAIUsage(userId, "voice_transcription");

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Transcription service not configured" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    console.log("Transcribe request - file size:", req.file.size, "bytes, mimetype:", req.file.mimetype);

    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Write to temp file for OpenAI SDK
    const fs = await import("fs");
    const path = await import("path");
    const os = await import("os");
    
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `audio_${Date.now()}.webm`);
    
    fs.writeFileSync(tempFile, req.file.buffer);
    
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFile),
        model: "whisper-1"
      });

      // Clean up temp file
      fs.unlinkSync(tempFile);

      // Filter profanities from transcript to keep it professional
      const cleanedTranscript = filter.clean(transcription.text);
      
      console.log("Transcription success:", cleanedTranscript.substring(0, 100));

      res.json({ transcript: cleanedTranscript });
    } catch (openaiError) {
      // Clean up temp file on error
      try { fs.unlinkSync(tempFile); } catch (e) {}
      throw openaiError;
    }
  } catch (error) {
    console.error("AI transcription error:", error.message || error);
    res.status(500).json({ error: "Failed to transcribe audio: " + (error.message || "Unknown error") });
  }
});

// DEPRECATED: Use /api/voice-command instead for unified voice commands
// AI PARSE QUOTE/INVOICE - Extract structured data from transcript using GPT
app.post("/api/ai/parse-quote", requireAI, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  await logAIUsage(userId, "quote_parsing");

  let { transcript } = req.body;

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Parsing service not configured" });
    }

    // Clean profanities from transcript before parsing (defensive filter)
    transcript = filter.clean(transcript);

    const openai = new (await import("openai")).default({
      apiKey: process.env.OPENAI_API_KEY
    });

    const systemPrompt = `You are a contractor AI assistant. Parse the user's voice transcription and extract structured data for a quote/invoice. Return ONLY valid JSON with these fields:
{
  "client_name": "extracted client name (first and last name)",
  "address": "extracted street address if mentioned",
  "job_type": "short job description like 'Electrical work' or 'Plumbing repair'",
  "line_items": [
    {
      "description": "brief service description (e.g., 'Electrical installation', 'Plumbing repair')",
      "quantity": 1,
      "unit_price": extracted_dollar_amount_as_number
    }
  ],
  "notes": ""
}

RULES:
- Extract the client's FULL NAME (first and last) 
- Extract the ADDRESS separately from the job description
- Line item description should be SHORT and professional (not include the address or client name)
- Parse dollar amounts like "$1354.95" or "1354 dollars" into numbers (1354.95)
- Do NOT put the whole transcript in notes - leave notes empty unless there are specific additional notes
- Return ONLY valid JSON, no markdown or explanation`;

    const message = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Parse this transcription into quote data: "${transcript}"` }
      ],
      temperature: 0
    });

    let parsedData = {};
    try {
      const content = message.choices[0].message.content;
      parsedData = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse GPT response:", e);
      parsedData = { description: transcript, line_items: [], notes: "" };
    }

    res.json(parsedData);
  } catch (error) {
    console.error("AI parsing error:", error);
    res.status(500).json({ error: "Failed to parse transcript" });
  }
});

// DEPRECATED: Use /api/voice-command instead for unified voice commands
// AI PARSE INVENTORY - Extract inventory item data from transcript
app.post("/api/ai/parse-inventory", requireAI, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  await logAIUsage(userId, "inventory_parsing");

  let { transcript } = req.body;

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Parsing service not configured" });
    }

    transcript = filter.clean(transcript);

    const openai = new (await import("openai")).default({
      apiKey: process.env.OPENAI_API_KEY
    });

    const systemPrompt = `You are a contractor inventory assistant. Parse the user's voice transcription and extract inventory item data. The user may list ONE or MULTIPLE items. Return ONLY valid JSON as an ARRAY of items:
{
  "items": [
    {
      "name": "item name (e.g., '1/4 inch copper fittings')",
      "quantity": number,
      "unit_price": number,
      "category": "category (Electrical, Plumbing, HVAC, Tools, Materials, Other)",
      "notes": "any additional notes"
    }
  ]
}

RULES:
- If user mentions MULTIPLE items, create a separate entry for EACH item
- Extract item NAME clearly and professionally
- Parse QUANTITY as a number (e.g., "50 pieces" = 50, default to 1 if not specified)
- Parse UNIT PRICE as a number (e.g., "$2.50 each" = 2.50, default to 0 if not specified)
- Guess CATEGORY based on item type
- Return ONLY valid JSON with "items" array

EXAMPLES:
"10 copper fittings at 2 dollars and 5 PVC pipes at 3 bucks" = 2 items
"add screwdriver" = 1 item`;

    const message = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Parse this into inventory data: "${transcript}"` }
      ],
      temperature: 0
    });

    let parsedData = { items: [] };
    try {
      const content = message.choices[0].message.content;
      parsedData = JSON.parse(content);
      // Handle legacy single-item format just in case
      if (!parsedData.items && parsedData.name) {
        parsedData = { items: [parsedData] };
      }
    } catch (e) {
      console.error("Failed to parse GPT response:", e);
      parsedData = { items: [{ name: transcript, quantity: 1, unit_price: 0, category: "Other" }] };
    }

    res.json(parsedData);
  } catch (error) {
    console.error("AI inventory parsing error:", error);
    res.status(500).json({ error: "Failed to parse transcript" });
  }
});

// DEPRECATED: Use /api/voice-command instead for unified voice commands
// AI PARSE CLIENT - Extract client data from transcript
app.post("/api/ai/parse-client", requireAI, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  await logAIUsage(userId, "client_parsing");

  let { transcript } = req.body;

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Parsing service not configured" });
    }

    transcript = filter.clean(transcript);

    const openai = new (await import("openai")).default({
      apiKey: process.env.OPENAI_API_KEY
    });

    const systemPrompt = `You are a contractor assistant. Parse the user's voice transcription and extract client/customer data. Return ONLY valid JSON with these fields:
{
  "name": "full name (first and last)",
  "email": "email address or empty string",
  "phone": "phone number or empty string",
  "address": "street address or empty string",
  "notes": "any additional notes"
}

RULES:
- Extract FULL NAME (first and last name)
- Format PHONE as digits with dashes (e.g., 555-123-4567)
- Extract EMAIL if mentioned
- Extract ADDRESS if mentioned
- Return ONLY valid JSON`;

    const message = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Parse this into client data: "${transcript}"` }
      ],
      temperature: 0
    });

    let parsedData = {};
    try {
      const content = message.choices[0].message.content;
      parsedData = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse GPT response:", e);
      parsedData = { name: transcript, email: "", phone: "", address: "" };
    }

    res.json(parsedData);
  } catch (error) {
    console.error("AI client parsing error:", error);
    res.status(500).json({ error: "Failed to parse transcript" });
  }
});

// AI PARSE CALENDAR EVENT - Extract calendar event data from transcript
app.post("/api/ai/parse-calendar", requireAI, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  await logAIUsage(userId, "calendar_parsing");

  let { transcript } = req.body;

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Parsing service not configured" });
    }

    transcript = filter.clean(transcript);

    const openai = new (await import("openai")).default({
      apiKey: process.env.OPENAI_API_KEY
    });

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    
    const systemPrompt = `You are a contractor assistant. Parse the user's voice transcription and extract calendar event data.

CURRENT DATE INFO:
- Today is ${dayOfWeek}, ${today}
- Use this to calculate relative dates accurately

Return ONLY valid JSON with these fields:
{
  "intent": "create_calendar_event",
  "title": "short event title describing the job/task",
  "client_name": "client name if mentioned or empty string",
  "date": "YYYY-MM-DD format",
  "time": "HH:MM in 24-hour format (interpret times like '9am' as '09:00', '3pm' as '15:00')",
  "notes": "any additional notes or context",
  "reminder": {
    "enabled": true or false,
    "offset_minutes_before": number (e.g., 60 for 1 hour before, 15 for 15 minutes)
  }
}

DATE CALCULATION RULES:
- "tomorrow" = add 1 day to today
- "Monday/Tuesday/etc" = the NEXT occurrence of that day (if today is Friday and user says Tuesday, that's 4 days from now)
- "next Monday" = the Monday of next week
- Calculate the exact YYYY-MM-DD date, don't guess

OTHER RULES:
- Extract CLIENT NAME if mentioned
- Create a concise TITLE for the event (e.g., "Radon job at Smith", "Plumbing repair")
- If user mentions "remind me X before", set reminder.enabled=true and appropriate offset
- Common offsets: "15 minutes before"=15, "30 minutes before"=30, "1 hour before"=60, "day before"=1440
- Return ONLY valid JSON`;

    const message = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Parse this into calendar event data: "${transcript}"` }
      ],
      temperature: 0
    });

    let parsedData = {};
    try {
      const content = message.choices[0].message.content;
      console.log("Calendar AI response:", content);
      parsedData = JSON.parse(content);
      console.log("Parsed calendar data:", parsedData);
    } catch (e) {
      console.error("Failed to parse GPT response:", e);
      parsedData = { 
        intent: "create_calendar_event",
        title: transcript, 
        client_name: "", 
        date: today, 
        time: "09:00",
        notes: "",
        reminder: { enabled: false, offset_minutes_before: 0 }
      };
    }

    res.json(parsedData);
  } catch (error) {
    console.error("AI calendar parsing error:", error);
    res.status(500).json({ error: "Failed to parse transcript" });
  }
});

// AI CREATE CALENDAR EVENT - Full voice-to-calendar workflow
app.post("/api/ai/create-calendar-event", requireAI, upload.single("audio"), async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  await logAIUsage(userId, "calendar_creation");

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI not configured" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const openai = new (await import("openai")).default({
      apiKey: process.env.OPENAI_API_KEY
    });

    // STEP 1: Transcribe
    const audioBlob = new (await import("buffer")).Blob([req.file.buffer], { type: "audio/wav" });
    const transcription = await openai.audio.transcriptions.create({
      file: audioBlob,
      model: "whisper-1"
    });

    let cleanedTranscript = filter.clean(transcription.text);

    const today = new Date().toISOString().split('T')[0];
    
    // STEP 2: Parse with GPT
    const parseSystemPrompt = `You are a contractor assistant. Parse this voice note into a calendar event. Today is ${today}. Return ONLY valid JSON:
{
  "title": "short event title",
  "client_name": "client name or empty",
  "date": "YYYY-MM-DD",
  "time": "HH:MM (24-hour)",
  "notes": "any notes",
  "reminder_minutes_before": number or null
}`;

    const parseMessage = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: parseSystemPrompt },
        { role: "user", content: `Parse into calendar event: "${cleanedTranscript}"` }
      ],
      temperature: 0
    });

    let eventData = {};
    try {
      eventData = JSON.parse(parseMessage.choices[0].message.content);
    } catch (e) {
      return res.status(400).json({ error: "Failed to parse voice command" });
    }

    if (!eventData.title || !eventData.date || !eventData.time) {
      return res.status(400).json({ error: "Could not extract event details from voice" });
    }

    // STEP 3: Try to match client
    let clientId = null;
    if (eventData.client_name) {
      const { data: clients } = await supabaseAdmin
        .from("clients")
        .select("id, name")
        .eq("user_id", userId)
        .ilike("name", `%${eventData.client_name}%`)
        .limit(1);
      
      if (clients && clients.length > 0) {
        clientId = clients[0].id;
      }
    }

    // STEP 4: Create the calendar event
    const eventDatetime = new Date(`${eventData.date}T${eventData.time}:00`).toISOString();
    let reminderDatetime = null;
    
    if (eventData.reminder_minutes_before) {
      const reminderDate = new Date(eventDatetime);
      reminderDate.setMinutes(reminderDate.getMinutes() - eventData.reminder_minutes_before);
      reminderDatetime = reminderDate.toISOString();
    }

    const { data: createdEvent, error: eventError } = await supabaseAdmin
      .from("calendar_events")
      .insert({
        user_id: userId,
        title: eventData.title,
        event_datetime: eventDatetime,
        client_id: clientId,
        reminder_datetime: reminderDatetime,
        notes: eventData.notes || null
      })
      .select()
      .single();

    if (eventError) {
      console.error("Error creating calendar event:", eventError);
      return res.status(500).json({ error: "Failed to create calendar event" });
    }

    res.json({
      success: true,
      transcript: cleanedTranscript,
      event: createdEvent,
      message: `Event scheduled for ${eventData.date} at ${eventData.time}`
    });
  } catch (error) {
    console.error("AI calendar creation error:", error);
    res.status(500).json({ error: "Failed to create calendar event" });
  }
});

// AI CREATE QUOTE FULL WORKFLOW - Complete voice-to-quote-PDF pipeline
app.post("/api/ai/create-quote-full", requireAI, upload.single("audio"), async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  await logAIUsage(userId, "quote_creation");

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI not configured" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const openai = new (await import("openai")).default({
      apiKey: process.env.OPENAI_API_KEY
    });

    // STEP 1: Transcribe
    const audioBlob = new (await import("buffer")).Blob([req.file.buffer], { type: "audio/wav" });
    const transcription = await openai.audio.transcriptions.create({
      file: audioBlob,
      model: "whisper-1"
    });

    let cleanedTranscript = filter.clean(transcription.text);

    // STEP 2: Parse with GPT to extract quote details
    const parseSystemPrompt = `You are a contractor AI. Parse this voice note into a complete quote. Extract: client_name, address, job_type, quote_date (YYYY-MM-DD), description, and line_items with prices. Return ONLY valid JSON:
{
  "client_name": "name",
  "address": "address or empty",
  "job_type": "type or empty",
  "quote_date": "YYYY-MM-DD",
  "description": "work description",
  "line_items": [{"description": "item", "quantity": 1, "unit_price": 0}],
  "template": "basic_clean"
}`;

    const parseMessage = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: parseSystemPrompt },
        { role: "user", content: `Parse into quote data: "${cleanedTranscript}"` }
      ],
      temperature: 0
    });

    let quoteData = {};
    try {
      quoteData = JSON.parse(parseMessage.choices[0].message.content);
    } catch (e) {
      return res.status(400).json({ error: "Failed to parse voice command" });
    }

    if (!quoteData.client_name) {
      return res.status(400).json({ error: "Could not extract client name from voice" });
    }

    // STEP 3: Create or find job folder
    const dateStr = quoteData.quote_date || new Date().toISOString().split('T')[0];
    const sanitize = (str) => (str || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    const folderName = `${sanitize(quoteData.client_name)}_${sanitize(quoteData.address || '')}_${dateStr}_${sanitize(quoteData.job_type || '')}`;

    // Find or create job
    let job;
    const { data: existingJobs } = await supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .eq("folder_name", folderName)
      .limit(1);

    if (existingJobs && existingJobs.length > 0) {
      job = existingJobs[0];
    } else {
      const { data: newJob, error: jobError } = await supabaseAdmin
        .from("jobs")
        .insert({
          user_id: userId,
          client_name: quoteData.client_name,
          address: quoteData.address || '',
          job_type: quoteData.job_type || '',
          folder_name: folderName,
          notes: quoteData.description || '',
          status: 'open'
        })
        .select()
        .single();

      if (jobError) throw new Error(`Job creation failed: ${jobError.message}`);
      job = newJob;
    }

    // STEP 4: Create quote
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("tax_rate")
      .eq("id", userId)
      .single();

    const items = quoteData.line_items || [];
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const taxRate = profile?.tax_rate || 0;
    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax;

    const { data: quote, error: quoteError } = await supabaseAdmin
      .from("quotes")
      .insert({
        user_id: userId,
        job_id: job.id,
        client_name: quoteData.client_name,
        quote_date: quoteData.quote_date || null,
        quote_number: `QUO-${Date.now()}`,
        notes: quoteData.description || '',
        template: quoteData.template || 'basic_clean',
        subtotal,
        tax,
        total,
        status: 'draft'
      })
      .select()
      .single();

    if (quoteError) throw new Error(`Quote creation failed: ${quoteError.message}`);

    // Add line items
    if (items.length > 0) {
      const itemRows = items.map(it => ({
        quote_id: quote.id,
        description: it.description,
        quantity: it.quantity || 1,
        unit_price: it.unit_price,
        total: it.unit_price * (it.quantity || 1)
      }));

      await supabaseAdmin
        .from("quote_items")
        .insert(itemRows);
    }

    res.json({
      success: true,
      quote_id: quote.id,
      job_id: job.id,
      quote_number: quote.quote_number,
      client_name: quoteData.client_name,
      total: total
    });
  } catch (error) {
    console.error("AI create quote full error:", error);
    res.status(500).json({ error: error.message || "Failed to create quote" });
  }
});

// DATABASE SCHEMA REQUIREMENTS
// When adding new columns, run these in BOTH dev and production Supabase SQL Editor:
// 
// ALTER TABLE invoices ADD COLUMN IF NOT EXISTS template text DEFAULT 'basic_clean';
// ALTER TABLE quotes ADD COLUMN IF NOT EXISTS template text DEFAULT 'basic_clean';
// ALTER TABLE invoices ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
// ALTER TABLE quotes ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_enabled boolean DEFAULT false;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_plan text;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_subscription_id text;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
// SELECT pg_notify('pgrst', 'reload schema');
//
// This comment serves as the master schema reference.

// INITIALIZE STORAGE BUCKETS
async function initializeStorageBuckets() {
  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error("Error listing buckets:", listError);
      return;
    }
    
    const bucketNames = buckets.map(b => b.name);
    
    // Create logos bucket if it doesn't exist
    if (!bucketNames.includes("logos")) {
      const { error: createError } = await supabaseAdmin.storage.createBucket("logos", {
        public: true,
        allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"]
      });
      
      if (createError) {
        console.error("Error creating logos bucket:", createError);
      } else {
        console.log("Created logos storage bucket");
      }
    }
    
    // Create invoice-photos bucket if it doesn't exist
    if (!bucketNames.includes("invoice-photos")) {
      const { error: createError } = await supabaseAdmin.storage.createBucket("invoice-photos", {
        public: true,
        allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"]
      });
      
      if (createError) {
        console.error("Error creating invoice-photos bucket:", createError);
      } else {
        console.log("Created invoice-photos storage bucket");
      }
    }
  } catch (err) {
    console.error("Error initializing storage buckets:", err);
  }
}

// PUBLIC INVOICE VIEW (no auth required - for clients to view their invoices)
app.get("/view/invoice/:id", async (req, res) => {
  try {
    const invoiceId = req.params.id;
    console.log(`Public invoice view requested for: ${invoiceId}`);
    
    // Handle "undefined" string or invalid IDs
    if (!invoiceId || invoiceId === 'undefined' || invoiceId === 'null') {
      console.log('Invalid invoice ID received:', invoiceId);
      return res.status(404).send("<h1>Invoice not found</h1>");
    }
    
    // Use direct SQL to bypass Supabase schema cache issues
    // Try by UUID first, then by invoice_number
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoiceId);
    
    const query = isUUID 
      ? `SELECT * FROM invoices WHERE id = $1`
      : `SELECT * FROM invoices WHERE invoice_number = $1`;
    
    const { rows: invoices } = await pgPool.query(query, [invoiceId]);
    console.log(`Found ${invoices.length} invoices for ID: ${invoiceId}`);
    
    if (!invoices.length) {
      return res.status(404).send("<h1>Invoice not found</h1>");
    }
    
    const invoice = invoices[0];
    
    // Get invoice items
    const { rows: items } = await pgPool.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC`,
      [invoiceId]
    );
    
    // Get business profile (including payment_link)
    const { rows: profiles } = await pgPool.query(
      `SELECT business_name, business_email as email, business_phone as phone, business_address as address, logo_url, payment_link FROM profiles WHERE id = $1`,
      [invoice.user_id]
    );
    const profile = profiles[0] || null;
    
    // Get client info
    let client = null;
    if (invoice.client_id) {
      const { rows: clients } = await pgPool.query(
        `SELECT name, email, phone, address FROM clients WHERE id = $1`,
        [invoice.client_id]
      );
      client = clients[0] || null;
    }
    
    // Get invoice attachments/photos
    const { rows: attachments } = await pgPool.query(
      `SELECT * FROM invoice_attachments WHERE invoice_id = $1`,
      [invoiceId]
    );
    
    const businessName = profile?.business_name || "Business";
    const logoUrl = profile?.logo_url || null;
    const clientName = client?.name || invoice.client_name || "Client";
    // Use the saved invoice total, not recalculated from items (in case items weren't saved properly)
    const total = parseFloat(invoice.total) || 0;
    
    // Generate HTML page
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${invoice.invoice_number || invoiceId} - ${businessName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1a56db, #3b82f6); color: white; padding: 30px; }
    .header h1 { font-size: 24px; margin-bottom: 5px; }
    .header p { opacity: 0.9; }
    .content { padding: 30px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .info-box h3 { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 8px; }
    .info-box p { color: #333; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f8f9fa; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; }
    td { padding: 12px; border-bottom: 1px solid #eee; }
    .total-row { background: #f8f9fa; font-weight: bold; font-size: 18px; }
    .total-row td { padding: 20px 12px; }
    .actions { display: flex; gap: 10px; justify-content: center; padding: 20px; background: #f8f9fa; }
    .btn { padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; display: inline-block; }
    .btn-primary { background: #1a56db; color: white; }
    .btn-secondary { background: #e5e7eb; color: #333; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-paid { background: #dcfce7; color: #166534; }
    .status-unpaid { background: #fee2e2; color: #991b1b; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    .photos-section { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
    .photos-section h3 { font-size: 14px; text-transform: uppercase; color: #666; margin-bottom: 15px; }
    .photos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
    .photo-item { border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .photo-item img { width: 100%; height: 150px; object-fit: cover; display: block; cursor: pointer; }
    @media (max-width: 600px) {
      .info-grid { grid-template-columns: 1fr; }
      .actions { flex-direction: column; }
      .photos-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height: 60px; max-width: 150px; margin-bottom: 10px; border-radius: 8px;">` : ''}
      <h1>${businessName}</h1>
      <p>Invoice #${invoice.invoice_number || invoiceId}</p>
    </div>
    <div class="content">
      <div class="info-grid">
        <div class="info-box">
          <h3>Bill To</h3>
          <p><strong>${clientName}</strong></p>
          ${client?.address ? `<p>${client.address}</p>` : ''}
          ${client?.email ? `<p>${client.email}</p>` : ''}
          ${client?.phone ? `<p>${client.phone}</p>` : ''}
        </div>
        <div class="info-box" style="text-align: right;">
          <h3>Invoice Details</h3>
          <p>Date: ${invoice.issue_date || new Date().toLocaleDateString()}</p>
          <p>Status: <span class="status ${invoice.payment_status === 'paid' ? 'status-paid' : invoice.payment_status === 'pending' ? 'status-pending' : 'status-unpaid'}">${(invoice.payment_status || 'unpaid').toUpperCase()}</span></p>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(items || []).map(item => `
            <tr>
              <td>${item.description || ''}</td>
              <td style="text-align: center;">${item.quantity || 1}</td>
              <td style="text-align: right;">$${(parseFloat(item.unit_price) || 0).toFixed(2)}</td>
              <td style="text-align: right;">$${(parseFloat(item.total) || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="3" style="text-align: right;">Total:</td>
            <td style="text-align: right;">$${total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      
      ${invoice.notes ? `<p style="color: #666; font-style: italic; margin-top: 20px;">${invoice.notes}</p>` : ''}
      
      ${attachments && attachments.length > 0 ? `
        <div class="photos-section">
          <h3>Job Photos</h3>
          <div class="photos-grid">
            ${attachments.map(photo => `
              <div class="photo-item">
                <a href="${photo.file_url}" target="_blank">
                  <img src="${photo.file_url}" alt="${photo.file_name || 'Job photo'}" loading="lazy">
                </a>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
    
    <div class="actions">
      ${(invoice.payment_url || profile?.payment_link) && invoice.payment_status !== 'paid' ? `<a href="${invoice.payment_url || profile?.payment_link}" class="btn btn-primary">Pay Now - $${total.toFixed(2)}</a>` : ''}
      <a href="javascript:window.print()" class="btn btn-secondary">Print / Save PDF</a>
    </div>
    
    <div class="footer">
      <p>Powered by <a href="https://trade-base.biz" style="color: #1a56db;">Skippy Stack</a></p>
    </div>
  </div>
</body>
</html>
    `;
    
    res.send(html);
  } catch (err) {
    console.error("Error rendering public invoice:", err);
    res.status(500).send("<h1>Error loading invoice</h1>");
  }
});

// PUBLIC QUOTE VIEW (no auth required - for clients to view their quotes)
app.get("/view/quote/:id", async (req, res) => {
  try {
    const quoteId = req.params.id;
    
    // Get quote
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();
    
    if (quoteError || !quote) {
      return res.status(404).send("<h1>Quote not found</h1>");
    }
    
    // Get quote items
    const { data: items } = await supabaseAdmin
      .from("quote_items")
      .select("*")
      .eq("quote_id", quoteId);
    
    // Get business profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("business_name, email, phone, address, logo_url")
      .eq("id", quote.user_id)
      .single();
    
    // Get client info
    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("name, email, phone, address")
      .eq("id", quote.client_id)
      .single();
    
    const businessName = profile?.business_name || "Business";
    const logoUrl = profile?.logo_url || null;
    const clientName = client?.name || quote.client_name || "Client";
    const total = items?.reduce((sum, item) => sum + (parseFloat(item.line_total) || parseFloat(item.total) || 0), 0) || 0;
    
    // Generate HTML page
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote #${quote.quote_number || quoteId} - ${businessName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px; }
    .header h1 { font-size: 24px; margin-bottom: 5px; }
    .header p { opacity: 0.9; }
    .content { padding: 30px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .info-box h3 { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 8px; }
    .info-box p { color: #333; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f8f9fa; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; }
    td { padding: 12px; border-bottom: 1px solid #eee; }
    .total-row { background: #f8f9fa; font-weight: bold; font-size: 18px; }
    .total-row td { padding: 20px 12px; }
    .actions { display: flex; gap: 10px; justify-content: center; padding: 20px; background: #f8f9fa; }
    .btn { padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; display: inline-block; cursor: pointer; border: none; }
    .btn-primary { background: #059669; color: white; }
    .btn-secondary { background: #e5e7eb; color: #333; }
    .notes { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin-top: 20px; border-radius: 0 8px 8px 0; }
    .notes h4 { color: #059669; margin-bottom: 8px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    .validity { background: #fef3c7; color: #92400e; padding: 10px 15px; border-radius: 8px; margin-top: 15px; text-align: center; }
    @media (max-width: 600px) {
      .info-grid { grid-template-columns: 1fr; }
      .actions { flex-direction: column; }
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height: 60px; max-width: 150px; margin-bottom: 10px; border-radius: 8px;">` : ''}
      <h1>${businessName}</h1>
      <p>Quote #${quote.quote_number || quoteId}</p>
    </div>
    <div class="content">
      <div class="info-grid">
        <div class="info-box">
          <h3>Prepared For</h3>
          <p><strong>${clientName}</strong></p>
          ${client?.address ? `<p>${client.address}</p>` : ''}
          ${client?.email ? `<p>${client.email}</p>` : ''}
          ${client?.phone ? `<p>${client.phone}</p>` : ''}
        </div>
        <div class="info-box" style="text-align: right;">
          <h3>Quote Details</h3>
          <p>Date: ${quote.quote_date || new Date().toLocaleDateString()}</p>
          <p>Status: ${(quote.status || 'pending').toUpperCase()}</p>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(items || []).map(item => `
            <tr>
              <td>${item.description || ''}</td>
              <td style="text-align: center;">${item.quantity || 1}</td>
              <td style="text-align: right;">$${(parseFloat(item.unit_price) || 0).toFixed(2)}</td>
              <td style="text-align: right;">$${(parseFloat(item.total) || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="3" style="text-align: right;">Total:</td>
            <td style="text-align: right;">$${total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      
      ${quote.notes ? `
        <div class="notes">
          <h4>Notes</h4>
          <p>${quote.notes}</p>
        </div>
      ` : ''}
      
      <div class="validity">
        <strong>This quote is valid for 30 days from the date above.</strong>
      </div>
    </div>
    
    <div class="actions">
      <button onclick="window.print()" class="btn btn-primary">Save as PDF / Print</button>
    </div>
    
    <div class="footer">
      <p>Powered by <a href="https://trade-base.biz" style="color: #059669;">Skippy Stack</a></p>
    </div>
  </div>
</body>
</html>
    `;
    
    res.send(html);
  } catch (err) {
    console.error("Error rendering public quote:", err);
    res.status(500).send("<h1>Error loading quote</h1>");
  }
});

// Force Supabase PostgREST to refresh its schema cache
async function refreshSupabaseSchemaCache() {
  try {
    await pgPool.query("NOTIFY pgrst, 'reload schema'");
    console.log("Supabase schema cache refresh triggered");
  } catch (err) {
    console.error("Could not refresh schema cache:", err.message);
  }
}

// START
app.listen(port, '0.0.0.0', async () => {
  console.log(`TradeBase server running on http://0.0.0.0:${port}`);
  await refreshSupabaseSchemaCache();
  await initializeStorageBuckets();
});
