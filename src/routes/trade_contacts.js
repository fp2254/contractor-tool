import express from "express";
import { v4 as uuidv4 } from "uuid";
import { pgPool } from "../utils/db.js";
import { requireSubscription } from "../middleware/auth.js";

const router = express.Router();

async function ensureTable() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS trade_contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      occupation TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

router.get("/", requireSubscription, async (req, res) => {
  const userId = req.userId;
  try {
    await ensureTable();
    const { rows } = await pgPool.query(
      `SELECT * FROM trade_contacts WHERE user_id = $1 ORDER BY occupation, name`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireSubscription, async (req, res) => {
  const userId = req.userId;
  const { name, phone, occupation, notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    await ensureTable();
    const id = uuidv4();
    const { rows } = await pgPool.query(
      `INSERT INTO trade_contacts (id, user_id, name, phone, occupation, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, userId, name, phone || null, occupation || null, notes || null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", requireSubscription, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { name, phone, occupation, notes } = req.body;

  try {
    await ensureTable();
    const { rows } = await pgPool.query(
      `UPDATE trade_contacts SET
        name = COALESCE($1, name),
        phone = $2,
        occupation = $3,
        notes = $4,
        updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [name, phone || null, occupation || null, notes || null, id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Trade contact not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", requireSubscription, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  try {
    await ensureTable();
    const { rowCount } = await pgPool.query(
      `DELETE FROM trade_contacts WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Trade contact not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
