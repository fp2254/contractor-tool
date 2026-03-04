import express from "express";
import { v4 as uuidv4 } from "uuid";
import { pgPool } from "../utils/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

async function ensureFollowupsTable() {
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS followups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        client_id UUID,
        job_id UUID,
        quote_id UUID,
        invoice_id UUID,
        type TEXT DEFAULT 'call',
        notes TEXT,
        due_date DATE,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch (err) {
    console.error("[followups] Migration error:", err.message);
  }
}
ensureFollowupsTable();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  try {
    const { rows } = await pgPool.query(
      `SELECT f.*, c.name as client_name
       FROM followups f
       LEFT JOIN clients c ON f.client_id = c.id
       WHERE f.user_id = $1
       ORDER BY f.completed_at ASC NULLS FIRST, f.due_date ASC NULLS LAST, f.created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { type, notes, due_date, client_id, job_id, quote_id, invoice_id } = req.body;
  try {
    const id = uuidv4();
    const { rows } = await pgPool.query(
      `INSERT INTO followups (id, user_id, type, notes, due_date, client_id, job_id, quote_id, invoice_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, userId, type || "call", notes || null, due_date || null,
       client_id || null, job_id || null, quote_id || null, invoice_id || null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { type, notes, due_date, completed } = req.body;
  try {
    const completedAt = completed ? new Date().toISOString() : null;
    const { rows } = await pgPool.query(
      `UPDATE followups SET
        type = COALESCE($1, type),
        notes = COALESCE($2, notes),
        due_date = COALESCE($3, due_date),
        completed_at = CASE WHEN $4 IS TRUE THEN NOW() WHEN $4 IS FALSE THEN NULL ELSE completed_at END
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [type, notes, due_date, completed !== undefined ? completed : null, id, userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Follow-up not found" });
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
      `DELETE FROM followups WHERE id = $1 AND user_id = $2`, [id, userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Follow-up not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
