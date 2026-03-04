import express from "express";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import { pgPool, supabaseAdminRaw } from "../utils/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

async function ensureTable() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS job_photos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL,
      user_id UUID NOT NULL,
      url TEXT NOT NULL,
      tag TEXT DEFAULT 'other',
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
      `SELECT * FROM job_photos WHERE job_id = $1 AND user_id = $2 ORDER BY created_at`,
      [jobId, userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireAuth, upload.single("photo"), async (req, res) => {
  const { jobId } = req.params;
  const userId = req.userId;
  const tag = req.body.tag || "other";

  if (!req.file) return res.status(400).json({ error: "No photo provided" });

  try {
    await ensureTable();

    const ext = req.file.mimetype.split("/")[1] || "jpg";
    const filename = `${Date.now()}.${ext}`;
    const storagePath = `${userId}/${jobId}/${filename}`;

    const { error: uploadErr } = await supabaseAdminRaw.storage
      .from("job-photos")
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadErr) throw new Error("Storage upload failed: " + uploadErr.message);

    const { data: { publicUrl } } = supabaseAdminRaw.storage
      .from("job-photos")
      .getPublicUrl(storagePath);

    const id = uuidv4();
    const { rows } = await pgPool.query(
      `INSERT INTO job_photos (id, job_id, user_id, url, tag) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, jobId, userId, publicUrl, tag]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:photoId", requireAuth, async (req, res) => {
  const { jobId, photoId } = req.params;
  const userId = req.userId;
  try {
    await ensureTable();
    const { rowCount } = await pgPool.query(
      `DELETE FROM job_photos WHERE id = $1 AND job_id = $2 AND user_id = $3`,
      [photoId, jobId, userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Photo not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
