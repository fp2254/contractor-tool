import express from "express";
import { v4 as uuidv4 } from "uuid";
import { pgPool } from "../utils/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });

async function ensureTable() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS job_materials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL,
      user_id UUID NOT NULL,
      name TEXT NOT NULL,
      quantity DECIMAL DEFAULT 1,
      unit TEXT,
      unit_cost DECIMAL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

router.get("/", requireAuth, async (req, res) => {
  const { jobId } = req.params;
  const userId = req.userId;
  try {
    await ensureTable();
    const { rows } = await pgPool.query(
      `SELECT * FROM job_materials WHERE job_id = $1 AND user_id = $2 ORDER BY created_at`,
      [jobId, userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { jobId } = req.params;
  const userId = req.userId;
  const { name, quantity, unit, unit_cost } = req.body;

  if (!name) return res.status(400).json({ error: "Name is required" });

  try {
    await ensureTable();
    const id = uuidv4();
    const { rows } = await pgPool.query(
      `INSERT INTO job_materials (id, job_id, user_id, name, quantity, unit, unit_cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, jobId, userId, name, quantity || 1, unit || null, unit_cost || 0]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:materialId", requireAuth, async (req, res) => {
  const { jobId, materialId } = req.params;
  const userId = req.userId;
  try {
    await ensureTable();
    const { rowCount } = await pgPool.query(
      `DELETE FROM job_materials WHERE id = $1 AND job_id = $2 AND user_id = $3`,
      [materialId, jobId, userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Material not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
