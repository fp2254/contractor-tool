import express from "express";
import cors from "cors";
import Stripe from "stripe";
import multer from "multer";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import puppeteer from "puppeteer-core";

dotenv.config();

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

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

// STRIPE
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// PLAN PRICE IDS (MUST MATCH FRONTEND)
const PLAN_PRICE_IDS = {
  lifetime_early: "price_1SVkdpBQnHmahVblGACoBqoJ",
  lifetime_regular: "price_1SVkdpBQnHmahVblGACoBqoJ",
  monthly: "price_1SUIKEBQnHmahVblf7WGY5lW",
  yearly: "price_1SUILYBQnHmahVblsHU8lwDE",
};

const ADDON_PRICE_IDS = {
  connect_stripe: "price_1SVkebBQnHmahVblU6qXXG4Q",
};

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
  try {
    // Log the usage
    await supabaseAdmin
      .from("ai_usage_logs")
      .insert({ user_id: userId, tool_type: toolType });
    
    // Increment the counter
    await supabaseAdmin.rpc('increment_ai_actions', { user_id_param: userId });
  } catch (err) {
    console.error("Failed to log AI usage:", err);
    // Fallback: try direct increment if RPC doesn't exist
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("ai_actions_used")
        .eq("id", userId)
        .single();
      
      await supabaseAdmin
        .from("profiles")
        .update({ ai_actions_used: (profile?.ai_actions_used || 0) + 1 })
        .eq("id", userId);
    } catch (fallbackErr) {
      console.error("Fallback increment failed:", fallbackErr);
    }
  }
}

// SUBSCRIPTION MIDDLEWARE FOR PROTECTED ROUTES
async function requireSubscription(req, res, next) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated", needsAuth: true });
  }
  
  const hasAccess = await hasActiveSubscription(userId);
  if (!hasAccess) {
    return res.status(402).json({ error: "Subscription required", needsSubscription: true });
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
  
  // Set trial on first profile creation
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id, trial_ends_at")
    .eq("id", userId)
    .single();
  
  if (!existing || !existing.trial_ends_at) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    payload.trial_ends_at = trialEnd.toISOString();
    payload.subscription_status = "trial";
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .upsert({
      ...payload,
      preferred_language: payload.preferred_language || 'en',
      preferred_template: payload.preferred_template || 'basic_clean',
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

// ENABLE STRIPE CONNECT (FREE FOR EVERYONE)
app.post("/api/stripe-connect/enable", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ stripe_connect_enabled: true })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error enabling Stripe Connect:", error);
      return res.status(500).json({ error: "Failed to enable payment collection" });
    }

    res.json({ success: true, message: "Payment collection enabled successfully" });
  } catch (err) {
    console.error("Error in enable Stripe Connect:", err);
    res.status(500).json({ error: "Failed to enable payment collection" });
  }
});

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

app.post("/api/clients", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const payload = { ...req.body, user_id: userId };
  console.log("Creating client with payload:", JSON.stringify(payload));

  const { data, error } = await supabaseAdmin
    .from("clients")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Client creation error:", error);
    return res.status(500).json({ 
      error: error.message,
      details: error.details || null,
      hint: error.hint || null,
      code: error.code || null
    });
  }
  res.json(data);
});

// INVOICES

app.get("/api/invoices", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json([]);

  const showArchived = req.query.archived === 'true';
  
  let query = supabaseAdmin
    .from("invoices")
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

app.post("/api/invoices", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { client_id, client_name, date, notes, template, subtotal, tax, total, items } = req.body;

  const { data: inv, error: errInv } = await supabaseAdmin
    .from("invoices")
    .insert({
      user_id: userId,
      client_id,
      client_name,
      date,
      notes,
      template: template || "basic_clean",
      subtotal,
      tax,
      total,
      status: "draft",
    })
    .select()
    .single();

  if (errInv) {
    console.error("Invoice creation error:", errInv);
    return res.status(500).json({ error: errInv.message });
  }

  if (Array.isArray(items) && items.length) {
    const itemsPayload = items.map((i) => ({
      invoice_id: inv.id,
      description: i.description,
      qty: i.qty,
      unit_price: i.unit_price,
      line_total: i.line_total,
    }));

    const { error: errItems } = await supabaseAdmin
      .from("invoice_items")
      .insert(itemsPayload);

    if (errItems) return res.status(500).json({ error: errItems.message });
  }

  res.json({ id: inv.id });
});

app.get("/api/invoices/:id", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const invoiceId = req.params.id;

  const { data: invoice, error: errInv } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .single();

  if (errInv) {
    if (errInv.code === "PGRST116") {
      return res.status(404).json({ error: "Invoice not found" });
    }
    return res.status(500).json({ error: errInv.message });
  }

  if (!invoice || invoice.user_id !== userId) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  const { data: items, error: errItems } = await supabaseAdmin
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId);

  if (errItems) return res.status(500).json({ error: errItems.message });

  let client = null;
  if (invoice.client_id) {
    const { data: clientData, error: errClient } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("id", invoice.client_id)
      .eq("user_id", userId)
      .single();

    if (errClient && errClient.code !== "PGRST116") {
      return res.status(500).json({ error: errClient.message });
    }
    client = clientData;
  }

  res.json({ ...invoice, items: items || [], client: client || null });
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

// ARCHIVE INVOICE
app.post("/api/invoices/:id/archive", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { data, error } = await supabaseAdmin
      .from("invoices")
      .update({ archived: true })
      .eq("id", req.params.id)
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
    const { data, error } = await supabaseAdmin
      .from("invoices")
      .update({ archived: false })
      .eq("id", req.params.id)
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
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    // First delete related items and attachments
    await supabaseAdmin
      .from("invoice_items")
      .delete()
      .eq("invoice_id", req.params.id);
    
    await supabaseAdmin
      .from("invoice_attachments")
      .delete()
      .eq("invoice_id", req.params.id);

    // Then delete the invoice
    const { error } = await supabaseAdmin
      .from("invoices")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", userId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting invoice:", err);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

// PAYMENT ENDPOINTS

// Generate Stripe Payment Link for an invoice
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
      .select("business_name")
      .eq("id", userId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const amountInCents = Math.round((invoice.total || 0) * 100);
    
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Invoice #${invoice.number || invoice.id}`,
            description: `Payment for ${profile.business_name || 'invoice'}`,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }],
      metadata: {
        invoice_id: invoiceId,
        user_id: userId,
      },
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: 'Thank you for your payment! Your invoice has been marked as paid.',
        },
      },
    });

    const { error: updateErr } = await supabaseAdmin
      .from("invoices")
      .update({ payment_link: paymentLink.url })
      .eq("id", invoiceId)
      .eq("user_id", userId);

    if (updateErr) {
      console.error("Error saving payment link:", updateErr);
    }

    res.json({ payment_link: paymentLink.url });
  } catch (error) {
    console.error("Error creating payment link:", error);
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
app.post("/api/inventory", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { name, description, quantity, unit_price, category, unit_type, low_stock_threshold } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const { data, error } = await supabaseAdmin
      .from("inventory_items")
      .insert({
        user_id: userId,
        name,
        description: description || null,
        quantity: quantity || 0,
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

    res.json(data);
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

  const { client_id, client_name, quote_date, quote_number, notes, template, subtotal, tax, total, items } = req.body;

  const { data: quote, error: errQuote } = await supabaseAdmin
    .from("quotes")
    .insert({
      user_id: userId,
      client_id,
      client_name,
      quote_date: quote_date || null,
      quote_number: quote_number || null,
      subtotal,
      tax,
      total,
      notes,
      template: template || "basic_clean",
      status: "draft",
    })
    .select()
    .single();

  if (errQuote) return res.status(500).json({ error: errQuote.message });

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

    if (errItems) return res.status(500).json({ error: errItems.message });
  }

  res.json({ id: quote.id });
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

  res.json({
    ...quote,
    items: items || [],
    client,
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

  try {
    // First delete related items
    await supabaseAdmin
      .from("quote_items")
      .delete()
      .eq("quote_id", req.params.id);

    // Then delete the quote
    const { error } = await supabaseAdmin
      .from("quotes")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", userId);

    if (error) return res.status(500).json({ error: error.message });
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
    
    let query = supabaseAdmin
      .from("calendar_events")
      .select(`
        *,
        clients (id, name),
        jobs (id, folder_name, client_name),
        quotes (id, quote_number, client_name),
        invoices (id, invoice_number, client_name)
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
        invoices (id, invoice_number, client_name)
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

// STRIPE CHECKOUT

app.post("/api/stripe/create-checkout-session", async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    let { plan, addons = [] } = req.body;
    
    if (plan === "lifetime_early") {
      const { count } = await supabaseAdmin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("subscription_plan", "lifetime_early");
      
      if (count >= 500) {
        plan = "lifetime_regular";
      }
    }
    
    const mainPrice = PLAN_PRICE_IDS[plan];
    if (!mainPrice) return res.status(400).json({ error: "Invalid plan" });

    const lineItems = [{ price: mainPrice, quantity: 1 }];
    
    const isLifetime = plan === "lifetime_early" || plan === "lifetime_regular";
    
    for (const code of addons) {
      if (isLifetime && code === "connect_stripe") {
        continue;
      }
      const addonPrice = ADDON_PRICE_IDS[code];
      if (addonPrice) lineItems.push({ price: addonPrice, quantity: 1 });
    }
    
    if (isLifetime && addons.includes("connect_stripe")) {
      sessionConfig.metadata.stripe_connect_included = "true";
    }

    const mode =
      plan === "monthly" || plan === "yearly" ? "subscription" : "payment";

    // Auto-detect frontend URL - production domain as guaranteed fallback
    const origin = req.headers.origin;
    const referer = req.headers.referer?.split('/app')[0];
    const frontendUrl = origin || referer || 'https://trade-base.biz';
    console.log('Checkout URL detection:', { origin, referer, frontendUrl });
    
    const sessionConfig = {
      mode,
      line_items: lineItems,
      success_url: `${frontendUrl}/app?checkout=success`,
      cancel_url: `${frontendUrl}/app?checkout=cancel`,
      client_reference_id: userId,
      metadata: {
        user_id: userId,
        plan,
        addons: addons.join(","),
      },
    };

    // Add 14-day trial for monthly plan
    if (plan === "monthly") {
      sessionConfig.subscription_data = {
        trial_period_days: 14,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({ sessionId: session.id });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: "Stripe checkout failed" });
  }
});

// STRIPE WEBHOOK
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn("No STRIPE_WEBHOOK_SECRET configured");
    return res.status(400).send("Webhook secret not configured");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.user_id;
        const invoiceId = session.metadata?.invoice_id;
        
        if (invoiceId && userId && session.payment_status === 'paid') {
          const { data: invoice } = await supabaseAdmin
            .from("invoices")
            .select("user_id")
            .eq("id", invoiceId)
            .single();
          
          if (invoice && invoice.user_id === userId) {
            await supabaseAdmin
              .from("invoices")
              .update({
                payment_status: "paid",
                paid_at: new Date().toISOString(),
              })
              .eq("id", invoiceId)
              .eq("user_id", userId);
            
            console.log(`Invoice ${invoiceId} marked as paid via Payment Link`);
          } else {
            console.error(`Webhook: Invoice ${invoiceId} user mismatch or not found`);
          }
        } else if (userId && session.subscription) {
          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: "active",
              subscription_plan: session.metadata?.plan || "monthly",
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
            })
            .eq("id", userId);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Check if this is an AI subscription by checking if subscription ID matches ai_subscription_id
        const { data: aiCheck } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("ai_subscription_id", subscription.id)
          .single();

        // If this is an AI subscription, handle it separately (don't update base subscription fields)
        if (aiCheck) {
          const aiStatus = subscription.status === "active" || subscription.status === "trialing";
          await supabaseAdmin
            .from("profiles")
            .update({ ai_enabled: aiStatus })
            .eq("id", aiCheck.id);
          console.log(`AI subscription ${subscription.id} status updated: ai_enabled=${aiStatus}`);
          break;
        }

        // This is a base subscription - update base subscription fields only
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, ai_subscription_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          // Skip if this subscription ID matches the AI subscription (edge case)
          if (profile.ai_subscription_id === subscription.id) {
            break;
          }

          const status = subscription.status === "active" || subscription.status === "trialing" 
            ? "active" 
            : subscription.status;

          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: status,
              stripe_subscription_id: subscription.id,
            })
            .eq("id", profile.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // FIRST: Check if this is an AI subscription being deleted
        const { data: aiProfile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("ai_subscription_id", subscription.id)
          .single();

        if (aiProfile) {
          // This is an AI subscription cancellation - disable AI but leave base subscription intact
          await supabaseAdmin
            .from("profiles")
            .update({
              ai_enabled: false,
              ai_plan: null,
              ai_subscription_id: null,
            })
            .eq("id", aiProfile.id);
          console.log(`AI subscription canceled for user ${aiProfile.id}`);
          break;
        }

        // This is a base subscription cancellation
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, stripe_subscription_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile && profile.stripe_subscription_id === subscription.id) {
          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: "canceled",
              subscription_ends_at: new Date().toISOString(),
            })
            .eq("id", profile.id);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: "past_due",
            })
            .eq("id", profile.id);
        }
        break;
      }
    }

    // Handle AI subscription activation from checkout.session.completed
    // (This runs AFTER the switch statement so AI subscriptions are properly flagged before updates)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.metadata?.is_ai_subscription === "true") {
        const userId = session.client_reference_id || session.metadata?.user_id;
        if (userId && session.subscription) {
          await supabaseAdmin
            .from("profiles")
            .update({
              ai_enabled: true,
              ai_plan: session.metadata?.ai_plan || "monthly",
              ai_subscription_id: session.subscription,
            })
            .eq("id", userId);
          console.log(`AI subscription activated for user ${userId}`);
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    res.status(500).send("Webhook handler failed");
  }
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
        ${invoice.tax > 0 ? `
        <div class="totals-row">
          <span class="totals-label">Tax:</span>
          <span class="totals-value">$${parseFloat(invoice.tax || 0).toFixed(2)}</span>
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
        ${invoice.payment_link ? `<p>Pay online: ${invoice.payment_link}</p>` : ''}
      </div>
    </body>
    </html>
  `;

  try {
    const browser = await puppeteer.launch({
      executablePath: '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
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
    const browser = await puppeteer.launch({
      executablePath: '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
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

    if (!recipientEmail) {
      return res.status(400).json({ error: "Recipient email is required" });
    }

    // Get invoice with all related data
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .select(`
        *,
        invoice_items (*),
        invoice_attachments (*)
      `)
      .eq("id", id)
      .eq("user_id", req.userId)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

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

          ${invoice.payment_link ? `
            <p style="text-align: center;">
              <a href="${escapeHtml(invoice.payment_link)}" class="button">Pay Invoice Online</a>
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
    const pdfBuffer = await generateInvoicePDF(invoice, profile);
    
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
        filename: `Invoice-${invoice.invoice_number}.pdf`,
        content: pdfBuffer.toString('base64'),
        content_type: 'application/pdf'
      }];
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

// Create AI subscription checkout session
app.post("/api/ai/subscribe", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { plan } = req.body; // 'monthly' or 'yearly'

  try {
    // Get user's profile for stripe customer ID
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", userId)
      .single();

    // Get or create Stripe customer
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email,
        metadata: { user_id: userId }
      });
      customerId = customer.id;

      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    // AI subscription prices - these should be created in Stripe Dashboard
    // For now, we'll use placeholder price IDs that you need to replace
    const priceId = plan === "yearly" 
      ? process.env.STRIPE_AI_YEARLY_PRICE_ID 
      : process.env.STRIPE_AI_MONTHLY_PRICE_ID;

    if (!priceId) {
      return res.status(500).json({ 
        error: "AI subscription not configured. Please set STRIPE_AI_MONTHLY_PRICE_ID and STRIPE_AI_YEARLY_PRICE_ID." 
      });
    }

    // Auto-detect frontend URL - production domain as guaranteed fallback
    const origin = req.headers.origin;
    const referer = req.headers.referer?.split('/app')[0];
    const frontendUrl = origin || referer || 'https://trade-base.biz';
    console.log('AI Checkout URL detection:', { origin, referer, frontendUrl, priceId });
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: userId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/app?ai_subscribed=true`,
      cancel_url: `${frontendUrl}/app?ai_canceled=true`,
      metadata: {
        user_id: userId,
        is_ai_subscription: "true",
        ai_plan: plan
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating AI checkout:", error.message, error);
    res.status(500).json({ error: "Failed to create AI subscription checkout", details: error.message });
  }
});

// Cancel AI subscription
app.post("/api/ai/cancel", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("ai_subscription_id")
      .eq("id", userId)
      .single();

    if (!profile?.ai_subscription_id) {
      return res.status(400).json({ error: "No AI subscription found" });
    }

    // Cancel the Stripe subscription immediately
    await stripe.subscriptions.cancel(profile.ai_subscription_id);

    // Immediately disable AI access
    await supabaseAdmin
      .from("profiles")
      .update({
        ai_enabled: false,
        ai_plan: null,
        ai_subscription_id: null,
      })
      .eq("id", userId);

    res.json({ success: true, message: "AI subscription canceled" });
  } catch (error) {
    console.error("Error canceling AI subscription:", error);
    res.status(500).json({ error: "Failed to cancel AI subscription" });
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
    
    // Get invoice with items
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();
    
    if (invoiceError || !invoice) {
      return res.status(404).send("<h1>Invoice not found</h1>");
    }
    
    // Get invoice items
    const { data: items } = await supabaseAdmin
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId);
    
    // Get business profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("business_name, email, phone, address, logo_url")
      .eq("id", invoice.user_id)
      .single();
    
    // Get client info
    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("name, email, phone, address")
      .eq("id", invoice.client_id)
      .single();
    
    const businessName = profile?.business_name || "Business";
    const total = items?.reduce((sum, item) => sum + (parseFloat(item.line_total) || parseFloat(item.total) || 0), 0) || 0;
    
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
    @media (max-width: 600px) {
      .info-grid { grid-template-columns: 1fr; }
      .actions { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${businessName}</h1>
      <p>Invoice #${invoice.invoice_number || invoiceId}</p>
    </div>
    <div class="content">
      <div class="info-grid">
        <div class="info-box">
          <h3>Bill To</h3>
          <p><strong>${client?.name || 'Client'}</strong></p>
          ${client?.address ? `<p>${client.address}</p>` : ''}
          ${client?.email ? `<p>${client.email}</p>` : ''}
          ${client?.phone ? `<p>${client.phone}</p>` : ''}
        </div>
        <div class="info-box" style="text-align: right;">
          <h3>Invoice Details</h3>
          <p>Date: ${invoice.date || new Date().toLocaleDateString()}</p>
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
              <td style="text-align: center;">${item.qty || item.quantity || 1}</td>
              <td style="text-align: right;">$${(parseFloat(item.unit_price) || parseFloat(item.price) || 0).toFixed(2)}</td>
              <td style="text-align: right;">$${(parseFloat(item.line_total) || parseFloat(item.total) || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="3" style="text-align: right;">Total:</td>
            <td style="text-align: right;">$${total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      
      ${invoice.notes ? `<p style="color: #666; font-style: italic; margin-top: 20px;">${invoice.notes}</p>` : ''}
    </div>
    
    <div class="actions">
      ${invoice.payment_link && invoice.payment_status !== 'paid' ? `<a href="${invoice.payment_link}" class="btn btn-primary">Pay Now</a>` : ''}
      <a href="javascript:window.print()" class="btn btn-secondary">Print / Save PDF</a>
    </div>
    
    <div class="footer">
      <p>Powered by <a href="https://trade-base.biz" style="color: #1a56db;">TradeBase</a></p>
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

// START
app.listen(port, '0.0.0.0', async () => {
  console.log(`TradeBase server running on http://0.0.0.0:${port}`);
  await initializeStorageBuckets();
});
