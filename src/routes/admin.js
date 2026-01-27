import express from "express";
import { v4 as uuidv4 } from "uuid";
import { pgPool, supabaseAdmin } from "../utils/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/check", requireAuth, async (req, res) => {
  const userId = req.userId;

  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    res.json({ is_admin: profile?.is_admin || false });
  } catch (err) {
    res.json({ is_admin: false });
  }
});

router.get("/users", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pgPool.query(
      `SELECT id, email, business_name, subscription_status, trial_ends_at, 
              ai_enabled, is_lifetime, created_at 
       FROM profiles 
       ORDER BY created_at DESC 
       LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/send-message", requireAdmin, async (req, res) => {
  const { title, content, type, target_user_id } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  try {
    const id = uuidv4();
    const { rows } = await pgPool.query(
      `INSERT INTO system_messages (id, title, content, type, target_user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, title, content, type || "info", target_user_id || null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/enable-ai", requireAdmin, async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    await pgPool.query(
      `UPDATE profiles SET ai_enabled = true, ai_actions_used = 0, ai_actions_limit = 300, 
       ai_billing_cycle_start = NOW() WHERE id = $1`,
      [user_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/grant-lifetime", requireAdmin, async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    await pgPool.query(
      `UPDATE profiles SET is_lifetime = true, subscription_status = 'active', 
       ai_enabled = true, ai_actions_limit = 1000 WHERE id = $1`,
      [user_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
