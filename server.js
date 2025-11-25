import express from "express";
import cors from "cors";
import Stripe from "stripe";
import multer from "multer";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// STATIC FRONTEND (serves index.html, script.js, etc.)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(__dirname, {
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

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
    trialEnd.setDate(trialEnd.getDate() + 7);
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
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  if (!req.file) return res.status(400).json({ error: "No file" });

  const ext = req.file.originalname.split(".").pop();
  const pathKey = `${userId}/logo.${ext || "png"}`;

  const { error: uploadErr } = await supabaseAdmin.storage
    .from("logos")
    .upload(pathKey, req.file.buffer, {
      upsert: true,
      contentType: req.file.mimetype,
    });

  if (uploadErr) return res.status(500).json({ error: uploadErr.message });

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("logos").getPublicUrl(pathKey);

  res.json({ logo_url: publicUrl });
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

  const { data, error } = await supabaseAdmin
    .from("clients")
    .insert(payload)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// INVOICES

app.get("/api/invoices", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json([]);

  const { data, error } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

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

  if (errInv) return res.status(500).json({ error: errInv.message });

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

  const { data, error } = await supabaseAdmin
    .from("quotes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

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

// REFERRALS SUMMARY

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

    const sessionConfig = {
      mode,
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL}?checkout=success`,
      cancel_url: `${process.env.FRONTEND_URL}?checkout=cancel`,
      client_reference_id: userId,
      metadata: {
        user_id: userId,
        plan,
        addons: addons.join(","),
      },
    };

    // Add 7-day trial for monthly plan
    if (plan === "monthly") {
      sessionConfig.subscription_data = {
        trial_period_days: 7,
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

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
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

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
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

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    res.status(500).send("Webhook handler failed");
  }
});

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

    // Generate confirmation link
    const confirmationLink = `${process.env.FRONTEND_URL || 'https://trade-base.biz'}/confirm-signup?userId=${userId}&email=${encodeURIComponent(email)}`;

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

    // Send email via Resend
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: subject,
      html: emailBody,
    });

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

// START

app.listen(port, '0.0.0.0', () => {
  console.log(`TradeBase server running on http://0.0.0.0:${port}`);
});
