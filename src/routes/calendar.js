import express from "express";
import { v4 as uuidv4 } from "uuid";
import { pgPool } from "../utils/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { start, end } = req.query;

  try {
    let query = `SELECT * FROM calendar_events WHERE user_id = $1`;
    const params = [userId];

    if (start && end) {
      query += ` AND start_time >= $2 AND start_time <= $3`;
      params.push(start, end);
    }

    query += ` ORDER BY start_time ASC`;

    const { rows } = await pgPool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  try {
    const { rows } = await pgPool.query(
      `SELECT * FROM calendar_events WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { title, description, start_time, end_time, all_day, location, color, client_id, job_id } =
    req.body;

  if (!title || !start_time) {
    return res.status(400).json({ error: "Title and start time are required" });
  }

  try {
    const id = uuidv4();
    const { rows } = await pgPool.query(
      `INSERT INTO calendar_events (id, user_id, title, description, start_time, end_time, all_day, location, color, client_id, job_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        id,
        userId,
        title,
        description || null,
        start_time,
        end_time || null,
        all_day || false,
        location || null,
        color || "#3788d8",
        client_id || null,
        job_id || null,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { title, description, start_time, end_time, all_day, location, color, client_id, job_id } =
    req.body;

  try {
    const { rows } = await pgPool.query(
      `UPDATE calendar_events SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        start_time = COALESCE($3, start_time),
        end_time = COALESCE($4, end_time),
        all_day = COALESCE($5, all_day),
        location = COALESCE($6, location),
        color = COALESCE($7, color),
        client_id = COALESCE($8, client_id),
        job_id = COALESCE($9, job_id),
        updated_at = NOW()
       WHERE id = $10 AND user_id = $11
       RETURNING *`,
      [title, description, start_time, end_time, all_day, location, color, client_id, job_id, id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
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
    const { rowCount } = await pgPool.query(
      `DELETE FROM calendar_events WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
