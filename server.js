import express from "express";
import cors from "cors";
import Stripe from "stripe";
import multer from "multer";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";

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
    .upsert(payload)
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
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("subscription_plan", "lifetime_early");

    if (error) {
      console.error("Error counting lifetime early:", error);
      return res.json({ count: 0 });
    }

    res.json({ count: data?.length || 0 });
  } catch (err) {
    console.error("Error in lifetime count:", err);
    res.json({ count: 0 });
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

  const { client_id, client_name, date, notes, subtotal, tax, total, items } = req.body;

  const { data: inv, error: errInv } = await supabaseAdmin
    .from("invoices")
    .insert({
      user_id: userId,
      client_id,
      client_name,
      date,
      notes,
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

// QUOTES (formerly estimates)

app.get("/api/quotes", requireSubscription, async (req, res) => {
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

app.post("/api/quotes", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { client_id, client_name, quote_date, quote_number, notes, subtotal, tax, total, items } = req.body;

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

app.get("/api/quotes/:id", requireSubscription, async (req, res) => {
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

    const { plan, addons = [] } = req.body;
    const mainPrice = PLAN_PRICE_IDS[plan];
    if (!mainPrice) return res.status(400).json({ error: "Invalid plan" });

    const lineItems = [{ price: mainPrice, quantity: 1 }];

    for (const code of addons) {
      const addonPrice = ADDON_PRICE_IDS[code];
      if (addonPrice) lineItems.push({ price: addonPrice, quantity: 1 });
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
        
        if (userId && session.subscription) {
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

// START

app.listen(port, '0.0.0.0', () => {
  console.log(`TradeBase server running on http://0.0.0.0:${port}`);
});
