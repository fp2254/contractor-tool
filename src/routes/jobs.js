import express from "express";
import { v4 as uuidv4 } from "uuid";
import { pgPool } from "../utils/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

async function ensureJobColumns() {
  const cols = [
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_date DATE",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS start_time TIME",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS client_phone TEXT",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ",
  ];
  for (const sql of cols) {
    try { await pgPool.query(sql); } catch (_) {}
  }
}
ensureJobColumns();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  try {
    const { rows } = await pgPool.query(
      `SELECT j.*, c.name as client_name, c.phone as client_phone_from_client
       FROM jobs j
       LEFT JOIN clients c ON j.client_id = c.id
       WHERE j.user_id = $1 ORDER BY j.created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { name, client_id, address, status, notes, scheduled_date, start_time, client_phone } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Job name is required" });
  }

  try {
    const id = uuidv4();
    const { rows } = await pgPool.query(
      `INSERT INTO jobs (id, user_id, name, client_id, address, status, notes, scheduled_date, start_time, client_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, userId, name, client_id || null, address || null, status || "pending", notes || null,
       scheduled_date || null, start_time || null, client_phone || null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  try {
    const { rows } = await pgPool.query(
      `SELECT j.*, c.name as client_name, c.email as client_email, c.phone as client_phone
       FROM jobs j
       LEFT JOIN clients c ON j.client_id = c.id
       WHERE j.id = $1 AND j.user_id = $2`,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    const job = rows[0];

    const { rows: invoices } = await pgPool.query(
      `SELECT id, number as invoice_number, total, payment_status FROM invoices WHERE job_id = $1`,
      [id]
    );

    const { rows: quotes } = await pgPool.query(
      `SELECT id, quote_number, total, status FROM quotes WHERE job_id = $1`,
      [id]
    );

    res.json({ ...job, invoices, quotes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { name, client_id, address, status, notes, scheduled_date, start_time, client_phone,
          arrived_at, started_at, completed_at } = req.body;

  try {
    // Build timestamp fields based on status transitions
    let arrivedAt = arrived_at;
    let startedAt = started_at;
    let completedAt = completed_at;
    if (status === 'arrived' && !arrivedAt) arrivedAt = new Date().toISOString();
    if (status === 'in_progress' && !startedAt) startedAt = new Date().toISOString();
    if (status === 'completed' && !completedAt) completedAt = new Date().toISOString();

    const { rows } = await pgPool.query(
      `UPDATE jobs SET
        name = COALESCE($1, name),
        client_id = COALESCE($2, client_id),
        address = COALESCE($3, address),
        status = COALESCE($4, status),
        notes = COALESCE($5, notes),
        scheduled_date = COALESCE($6, scheduled_date),
        start_time = COALESCE($7, start_time),
        client_phone = COALESCE($8, client_phone),
        arrived_at = COALESCE($9, arrived_at),
        started_at = COALESCE($10, started_at),
        completed_at = COALESCE($11, completed_at),
        updated_at = NOW()
       WHERE id = $12 AND user_id = $13
       RETURNING *`,
      [name, client_id, address, status, notes, scheduled_date, start_time, client_phone,
       arrivedAt, startedAt, completedAt, id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  try {
    const { rowCount } = await pgPool.query(`DELETE FROM jobs WHERE id = $1 AND user_id = $2`, [
      id,
      userId,
    ]);
    if (rowCount === 0) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
