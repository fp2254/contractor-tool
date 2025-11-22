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
const port = process.env.PORT || 3000;

// STATIC FRONTEND (serves index.html, script.js, etc.)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(__dirname));

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

// AUTH "MIDDLEWARE": TRUST X-USER-ID HEADER FROM FRONTEND
app.use((req, res, next) => {
  const userId = req.header("X-User-Id") || req.header("x-user-id");
  req.userId = userId || null;
  next();
});

// SMALL HELPER
function makeReferralCode(userId) {
  if (userId) {
    return userId.replace(/-/g, "").slice(0, 10);
  }
  return Math.random().toString(36).slice(2, 10);
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

// CLIENTS

app.get("/api/clients", async (req, res) => {
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

app.post("/api/clients", async (req, res) => {
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

app.get("/api/invoices", async (req, res) => {
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

app.post("/api/invoices", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { client_id, date, notes, subtotal, tax, total, items } = req.body;

  const { data: inv, error: errInv } = await supabaseAdmin
    .from("invoices")
    .insert({
      user_id: userId,
      client_id,
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

// ESTIMATES (simple v1)

app.get("/api/estimates", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json([]);

  const { data, error } = await supabaseAdmin
    .from("estimates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
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

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/billing`,
      metadata: {
        user_id: userId,
        plan,
        addons: addons.join(","),
      },
    });

    res.json({ sessionId: session.id });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: "Stripe checkout failed" });
  }
});

// START

app.listen(port, () => {
  console.log(`TradeBase server running on port ${port}`);
});
