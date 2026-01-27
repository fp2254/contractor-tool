import express from "express";
import { v4 as uuidv4 } from "uuid";
import { pgPool } from "../utils/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  try {
    const { rows } = await pgPool.query(
      `SELECT * FROM jobs WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { name, client_id, address, status, notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Job name is required" });
  }

  try {
    const id = uuidv4();
    const { rows } = await pgPool.query(
      `INSERT INTO jobs (id, user_id, name, client_id, address, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, userId, name, client_id || null, address || null, status || "pending", notes || null]
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
  const { name, client_id, address, status, notes } = req.body;

  try {
    const { rows } = await pgPool.query(
      `UPDATE jobs SET
        name = COALESCE($1, name),
        client_id = COALESCE($2, client_id),
        address = COALESCE($3, address),
        status = COALESCE($4, status),
        notes = COALESCE($5, notes),
        updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [name, client_id, address, status, notes, id, userId]
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
