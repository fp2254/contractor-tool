import express from "express";
import { v4 as uuidv4 } from "uuid";
import { pgPool } from "../utils/db.js";
import { requireSubscription } from "../middleware/auth.js";
import { buildPaymentUrl } from "../utils/helpers.js";

const router = express.Router();

router.post("/generate-payment-url", async (req, res) => {
  const { provider, value, amount, invoiceNumber } = req.body;
  
  if (!provider || !value) {
    return res.status(400).json({ error: "Provider and value are required" });
  }
  
  const url = buildPaymentUrl(provider, value, amount || 0, invoiceNumber || "");
  
  if (!url) {
    return res.status(400).json({ error: "Could not generate payment URL for this provider" });
  }
  
  res.json({ url, provider, amount });
});

router.get("/payment-links", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json([]);

  try {
    const { rows } = await pgPool.query(
      `SELECT * FROM payment_links WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/payment-links", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { name, provider, value, is_default } = req.body;

  if (!name || !provider || !value) {
    return res.status(400).json({ error: "Name, provider, and value are required" });
  }

  try {
    if (is_default) {
      await pgPool.query(`UPDATE payment_links SET is_default = false WHERE user_id = $1`, [userId]);
    }

    const id = uuidv4();
    const { rows } = await pgPool.query(
      `INSERT INTO payment_links (id, user_id, name, provider, value, is_default)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, userId, name, provider, value, is_default || false]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/payment-links/:id", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.params;
  const { name, provider, value, is_default } = req.body;

  try {
    if (is_default) {
      await pgPool.query(`UPDATE payment_links SET is_default = false WHERE user_id = $1`, [userId]);
    }

    const { rows } = await pgPool.query(
      `UPDATE payment_links SET
        name = COALESCE($1, name),
        provider = COALESCE($2, provider),
        value = COALESCE($3, value),
        is_default = COALESCE($4, is_default),
        updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [name, provider, value, is_default, id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Payment link not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/payment-links/:id", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.params;

  try {
    const { rowCount } = await pgPool.query(
      `DELETE FROM payment_links WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Payment link not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/payment-links/:id/default", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.params;

  try {
    await pgPool.query(`UPDATE payment_links SET is_default = false WHERE user_id = $1`, [userId]);
    
    const { rows } = await pgPool.query(
      `UPDATE payment_links SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Payment link not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
