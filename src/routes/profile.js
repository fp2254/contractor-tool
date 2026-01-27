import express from "express";
import multer from "multer";
import { supabaseAdmin, pgPool } from "../utils/db.js";
import { makeReferralCode } from "../utils/helpers.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", async (req, res) => {
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

router.post("/", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  console.log("[PROFILE SAVE] User:", userId, "Body:", JSON.stringify(req.body));

  const allowedColumns = [
    "id", "email", "business_name", "business_email", "business_phone", "business_address",
    "business_website", "logo_url", "trade_type", "preferred_language", "preferred_template",
    "subscription_status", "subscription_id", "subscription_plan", "trial_ends_at", "subscription_ends_at",
    "is_lifetime", "ai_enabled", "ai_plan", "ai_subscription_id", "referral_code", "referred_by",
    "invites_sent", "referral_bonus_days", "is_admin", "stripe_customer_id", "stripe_connect_account_id",
    "stripe_connect_enabled", "ai_actions_used", "ai_actions_limit", "ai_billing_cycle_start",
    "default_warranty_text", "default_tax_percent", "default_markup_percent", "invoice_footer",
    "payment_link", "venmo_username", "payment_provider", "payment_value",
  ];

  const filteredBody = {};
  for (const key of Object.keys(req.body)) {
    if (allowedColumns.includes(key)) {
      filteredBody[key] = req.body[key];
    }
  }

  const payload = { ...filteredBody, id: userId };

  let existing = null;
  try {
    const { rows } = await pgPool.query(
      `SELECT id, trial_ends_at, subscription_status, subscription_plan, subscription_ends_at,
              ai_enabled, ai_plan, ai_subscription_id, ai_actions_used, ai_actions_limit, ai_billing_cycle_start
       FROM profiles WHERE id = $1`,
      [userId]
    );
    existing = rows[0] || null;
  } catch (fetchErr) {
    console.error("[PROFILE SAVE] Error fetching existing:", fetchErr.message);
  }

  if (!existing) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    payload.trial_ends_at = trialEnd.toISOString();
    payload.subscription_status = "trialing";
  } else {
    delete payload.trial_ends_at;
    delete payload.subscription_status;
    delete payload.subscription_plan;
    delete payload.subscription_ends_at;
    delete payload.ai_enabled;
    delete payload.ai_plan;
    delete payload.ai_subscription_id;
    delete payload.ai_actions_used;
    delete payload.ai_actions_limit;
    delete payload.ai_billing_cycle_start;
  }

  if (!payload.referral_code) {
    payload.referral_code = makeReferralCode(userId);
  }

  const columns = Object.keys(payload);
  const values = Object.values(payload);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const updateSet = columns
    .filter((c) => c !== "id")
    .map((c, i) => `${c} = EXCLUDED.${c}`)
    .join(", ");

  const sql = `
    INSERT INTO profiles (${columns.join(", ")})
    VALUES (${placeholders})
    ON CONFLICT (id) DO UPDATE SET ${updateSet}
    RETURNING *
  `;

  try {
    const { rows } = await pgPool.query(sql, values);
    console.log("[PROFILE SAVE] Success for user:", userId);
    res.json(rows[0]);
  } catch (err) {
    console.error("[PROFILE SAVE] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/logo", upload.single("logo"), async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  if (!req.file) {
    return res.status(400).json({ error: "No logo file provided" });
  }

  try {
    const filename = `${userId}/logo_${Date.now()}.${req.file.originalname.split(".").pop()}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("logos")
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error("Logo upload error:", uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    const { data: urlData } = supabaseAdmin.storage.from("logos").getPublicUrl(filename);

    await pgPool.query(`UPDATE profiles SET logo_url = $1 WHERE id = $2`, [
      urlData.publicUrl,
      userId,
    ]);

    res.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("Logo upload failed:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/lifetime-count", async (req, res) => {
  try {
    const { rows } = await pgPool.query(
      `SELECT COUNT(*) as count FROM profiles WHERE is_lifetime = true`
    );
    res.json({ count: parseInt(rows[0]?.count || "0") });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
