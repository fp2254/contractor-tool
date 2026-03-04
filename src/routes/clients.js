import express from "express";
import { v4 as uuidv4 } from "uuid";
import { pgPool } from "../utils/db.js";
import { requireSubscription } from "../middleware/auth.js";

const router = express.Router();

async function ensureCustomersView() {
  try {
    await pgPool.query(`CREATE OR REPLACE VIEW customers AS SELECT * FROM clients`);
  } catch (_) {}
}
ensureCustomersView();

router.get("/", requireSubscription, async (req, res) => {
  const userId = req.userId;
  try {
    const { rows } = await pgPool.query(
      `SELECT * FROM clients WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", requireSubscription, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  try {
    const { rows } = await pgPool.query(
      `SELECT * FROM clients WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireSubscription, async (req, res) => {
  const userId = req.userId;
  const { name, email, phone, address, notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Client name is required" });
  }

  try {
    const id = uuidv4();
    const { rows } = await pgPool.query(
      `INSERT INTO clients (id, user_id, name, email, phone, address, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, userId, name, email || null, phone || null, address || null, notes || null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", requireSubscription, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { name, email, phone, address, notes } = req.body;

  try {
    const { rows: existing } = await pgPool.query(
      `SELECT id FROM clients WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    const { rows } = await pgPool.query(
      `UPDATE clients SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        address = COALESCE($4, address),
        notes = COALESCE($5, notes),
        updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [name, email, phone, address, notes, id, userId]
    );
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
      `DELETE FROM clients WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/addresses", requireSubscription, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  try {
    const { rows: clientRows } = await pgPool.query(
      `SELECT id FROM clients WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (clientRows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    const { rows } = await pgPool.query(
      `SELECT * FROM client_addresses WHERE client_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/addresses", requireSubscription, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { address, label, is_default } = req.body;

  if (!address) {
    return res.status(400).json({ error: "Address is required" });
  }

  try {
    const { rows: clientRows } = await pgPool.query(
      `SELECT id FROM clients WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (clientRows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    if (is_default) {
      await pgPool.query(
        `UPDATE client_addresses SET is_default = false WHERE client_id = $1`,
        [id]
      );
    }

    const addressId = uuidv4();
    const { rows } = await pgPool.query(
      `INSERT INTO client_addresses (id, client_id, address, label, is_default)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [addressId, id, address, label || null, is_default || false]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/addresses/:addressId", requireSubscription, async (req, res) => {
  const userId = req.userId;
  const { id, addressId } = req.params;
  const { address, label, is_default } = req.body;

  try {
    const { rows: clientRows } = await pgPool.query(
      `SELECT id FROM clients WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (clientRows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    if (is_default) {
      await pgPool.query(
        `UPDATE client_addresses SET is_default = false WHERE client_id = $1`,
        [id]
      );
    }

    const { rows } = await pgPool.query(
      `UPDATE client_addresses SET
        address = COALESCE($1, address),
        label = COALESCE($2, label),
        is_default = COALESCE($3, is_default),
        updated_at = NOW()
       WHERE id = $4 AND client_id = $5
       RETURNING *`,
      [address, label, is_default, addressId, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Address not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id/addresses/:addressId", requireSubscription, async (req, res) => {
  const userId = req.userId;
  const { id, addressId } = req.params;

  try {
    const { rows: clientRows } = await pgPool.query(
      `SELECT id FROM clients WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (clientRows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    const { rowCount } = await pgPool.query(
      `DELETE FROM client_addresses WHERE id = $1 AND client_id = $2`,
      [addressId, id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: "Address not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
