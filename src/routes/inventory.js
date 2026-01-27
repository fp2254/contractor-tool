import express from "express";
import { v4 as uuidv4 } from "uuid";
import { pgPool } from "../utils/db.js";
import { requireSubscription } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireSubscription, async (req, res) => {
  const userId = req.userId;
  try {
    const { rows } = await pgPool.query(
      `SELECT * FROM inventory_items WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireSubscription, async (req, res) => {
  const userId = req.userId;
  const { name, quantity, unit_price, category, notes, unit } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Item name is required" });
  }

  try {
    const id = uuidv4();
    const { rows } = await pgPool.query(
      `INSERT INTO inventory_items (id, user_id, name, quantity, unit_price, category, notes, unit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        userId,
        name,
        quantity || 1,
        unit_price || 0,
        category || "Other",
        notes || null,
        unit || "each",
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", requireSubscription, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { name, quantity, unit_price, category, notes, unit } = req.body;

  try {
    const { rows } = await pgPool.query(
      `UPDATE inventory_items SET
        name = COALESCE($1, name),
        quantity = COALESCE($2, quantity),
        unit_price = COALESCE($3, unit_price),
        category = COALESCE($4, category),
        notes = COALESCE($5, notes),
        unit = COALESCE($6, unit),
        updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [name, quantity, unit_price, category, notes, unit, id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
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
    const { rowCount } = await pgPool.query(
      `DELETE FROM inventory_items WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
