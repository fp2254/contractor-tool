import express from "express";
import { pgPool, supabaseAdmin } from "../utils/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId;

  try {
    const { rows } = await pgPool.query(
      `SELECT * FROM system_messages 
       WHERE (target_user_id IS NULL OR target_user_id = $1)
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  try {
    const { rows } = await pgPool.query(
      `UPDATE system_messages SET read_by = 
        CASE 
          WHEN read_by IS NULL THEN ARRAY[$1]::uuid[]
          WHEN $1 = ANY(read_by) THEN read_by
          ELSE array_append(read_by, $1)
        END
       WHERE id = $2
       RETURNING *`,
      [userId, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Message not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
