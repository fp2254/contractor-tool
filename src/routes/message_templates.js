import express from "express";
import { v4 as uuidv4 } from "uuid";
import { pgPool } from "../utils/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

async function ensureMessageTemplatesTable() {
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS message_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        name TEXT NOT NULL,
        body TEXT NOT NULL,
        trigger TEXT DEFAULT 'manual',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch (err) {
    console.error("[message_templates] Migration error:", err.message);
  }
}
ensureMessageTemplatesTable();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  try {
    const { rows } = await pgPool.query(
      `SELECT * FROM message_templates WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { name, body, trigger } = req.body;
  if (!name || !body) return res.status(400).json({ error: "Name and body are required" });
  try {
    const id = uuidv4();
    const { rows } = await pgPool.query(
      `INSERT INTO message_templates (id, user_id, name, body, trigger)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, userId, name, body, trigger || "manual"]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { name, body, trigger } = req.body;
  try {
    const { rows } = await pgPool.query(
      `UPDATE message_templates SET
        name = COALESCE($1, name),
        body = COALESCE($2, body),
        trigger = COALESCE($3, trigger),
        updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [name, body, trigger, id, userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Template not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  try {
    const { rowCount } = await pgPool.query(
      `DELETE FROM message_templates WHERE id = $1 AND user_id = $2`, [id, userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Template not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
