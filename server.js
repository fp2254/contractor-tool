import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

import { BUILD_VERSION, BUILD_TIMESTAMP, BUILD_ID, port } from "./src/utils/config.js";
import { pgPool, supabaseAdmin, supabaseAdminRaw } from "./src/utils/db.js";
import { getChromiumPath, filter, buildPaymentUrl, makeReferralCode } from "./src/utils/helpers.js";
import { authMiddleware, requireAuth, requireSubscription, requireAdmin, requireAI } from "./src/middleware/auth.js";
import { logAIUsage, getAIUsageInfo, VOICE_COMMAND_TOOLS, AI_MODELS } from "./src/services/ai.js";
import { generatePDF } from "./src/services/pdf.js";
import { sendEmail } from "./src/services/email.js";
import { registerRoutes } from "./src/routes/index.js";

import puppeteer from "puppeteer-core";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api", (req, res, next) => {
  res.setHeader("X-Hit-Express", `YES-v${BUILD_VERSION}`);
  res.setHeader("X-Tradebase-Server", BUILD_ID);
  res.setHeader("X-Build-ID", BUILD_ID);
  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: Date.now() });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "landing.html"));
});

app.get("/app", (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  res.setHeader("X-Build-Version", String(BUILD_VERSION));
  res.sendFile(path.join(__dirname, "index.html"));
});

app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  },
}));

app.use(authMiddleware);

app.get("/api/version", (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("X-Build-ID", BUILD_ID);
  res.json({ version: BUILD_VERSION, build: BUILD_TIMESTAMP, buildId: BUILD_ID, sanitization: true, timestamp: Date.now() });
});

app.get("/api/express-check", (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("X-Express-Proof", "CONFIRMED-v141");
  res.json({ express: true, version: BUILD_VERSION, buildId: BUILD_ID, timestamp: Date.now(), message: "This response ONLY comes from Express." });
});

registerRoutes(app);

async function pgQueryWithRetry(sql, params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await pgPool.query(sql, params);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 100 * (i + 1)));
    }
  }
}

async function resolveInvoiceId(invoiceIdParam, userId) {
  const isBigInt = /^\d+$/.test(invoiceIdParam);
  try {
    if (isBigInt) {
      const { rows } = await pgPool.query(`SELECT id FROM invoices WHERE id = $1 AND user_id = $2`, [invoiceIdParam, userId]);
      return rows.length ? rows[0].id : null;
    } else {
      const { rows } = await pgPool.query(`SELECT id FROM invoices WHERE number = $1 AND user_id = $2`, [invoiceIdParam, userId]);
      return rows.length ? rows[0].id : null;
    }
  } catch (err) {
    console.error("[resolveInvoiceId] Error:", err);
    return null;
  }
}

app.get("/api/invoices", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json([]);

  const showArchived = req.query.archived === "true";

  try {
    const archivedCondition = showArchived ? "AND i.archived = true" : "AND (i.archived IS NULL OR i.archived = false)";

    const { rows: invoices } = await pgPool.query(
      `SELECT i.*, 
        i.number as invoice_number,
        TO_CHAR(i.date, 'YYYY-MM-DD') as issue_date,
        i.tax as tax_amount,
        i.payment_link as payment_url,
        COALESCE(i.client_name, c.name) as client_name,
        c.email as client_email, 
        c.phone as client_phone
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.user_id = $1 ${archivedCondition}
      ORDER BY i.created_at DESC`,
      [userId]
    );

    res.json(invoices);
  } catch (err) {
    console.error("Error fetching invoices:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/invoices", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { client_id, job_id, client_name, client_address, issue_date, notes, template, payment_url, subtotal, tax_amount, total, items } = req.body;

  const trimString = (v) => (v === null || v === undefined ? null : typeof v === "string" ? v.trim() || null : null);
  const toFiniteNumber = (v) => (v === null || v === undefined || v === "" ? 0 : Number.isFinite(Number(v)) ? Number(v) : 0);
  const toValidDate = (v) => {
    if (!v || v === "") return new Date().toISOString().split("T")[0];
    const d = new Date(v);
    return isNaN(d.getTime()) ? new Date().toISOString().split("T")[0] : d.toISOString().split("T")[0];
  };
  const toIdOrNull = (v) => (v === null || v === undefined || v === "" ? null : v);

  const sanitized = {
    client_id: toIdOrNull(client_id),
    job_id: toIdOrNull(job_id),
    client_name: trimString(client_name),
    client_address: trimString(client_address),
    issue_date: toValidDate(issue_date),
    notes: trimString(notes),
    template: trimString(template) || "basic_clean",
    payment_url: trimString(payment_url),
    subtotal: toFiniteNumber(subtotal),
    tax_amount: toFiniteNumber(tax_amount),
    total: toFiniteNumber(total),
  };

  try {
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const countResult = await pgQueryWithRetry(`SELECT COUNT(*) as cnt FROM invoices WHERE user_id = $1 AND number LIKE $2`, [userId, `INV-${dateStr}-%`]);
    const seqNum = (parseInt(countResult.rows[0].cnt) + 1).toString().padStart(3, "0");
    const invoiceNumber = `INV-${dateStr}-${seqNum}`;

    const result = await pgQueryWithRetry(
      `INSERT INTO invoices (user_id, client_id, client_name, client_address, number, date, notes, subtotal, tax, total, status, payment_status, template, job_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, number as invoice_number`,
      [userId, sanitized.client_id, sanitized.client_name, sanitized.client_address, invoiceNumber, sanitized.issue_date, sanitized.notes, sanitized.subtotal, sanitized.tax_amount, sanitized.total, "draft", "unpaid", sanitized.template, sanitized.job_id]
    );

    const inv = result.rows[0];
    const invoiceId = inv.id;
    console.log(`[INVOICE] Created: ${inv.invoice_number} (${invoiceId})`);

    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const desc = (item.description || "").trim() || "Item";
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unit_price) || 0;
        const itemTotal = Number(item.total) || qty * price;
        await pgQueryWithRetry(`INSERT INTO invoice_items (invoice_id, description, qty, unit_price, line_total) VALUES ($1, $2, $3, $4, $5)`, [invoiceId, desc, qty, price, itemTotal]);
      }
    }

    return res.status(201).json({ id: invoiceId, invoice_number: inv.invoice_number });
  } catch (err) {
    console.error(`[INVOICE ERROR] ${err.message}`, { code: err.code, detail: err.detail });
    return res.status(500).json({ error: err.message || "Failed to create invoice" });
  }
});

app.put("/api/invoices/:id", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const invoiceIdParam = req.params.id;
  const { client_id, job_id, client_name, client_address, issue_date, notes, template, payment_url, subtotal, tax_amount, total, items } = req.body;

  const toNull = (v) => (v === "" || v === undefined || v === null ? null : v);
  const toNumber = (v) => (v === "" || v === null || v === undefined ? 0 : Number(v) || 0);
  const toDate = (v) => {
    if (!v || v === "") return new Date().toISOString().split("T")[0];
    const d = new Date(v);
    return isNaN(d.getTime()) ? new Date().toISOString().split("T")[0] : d.toISOString().split("T")[0];
  };
  const toIdOrNull = (v) => (v === null || v === undefined || v === "" ? null : v);

  const sanitized = {
    client_id: toIdOrNull(client_id),
    job_id: toIdOrNull(job_id),
    client_name: toNull(client_name),
    client_address: toNull(client_address),
    issue_date: toDate(issue_date),
    notes: toNull(notes),
    template: template || "basic_clean",
    payment_url: toNull(payment_url),
    subtotal: toNumber(subtotal),
    tax_amount: toNumber(tax_amount),
    total: toNumber(total),
  };

  const dbClient = await pgPool.connect();
  try {
    await dbClient.query("BEGIN");

    const isBigInt = /^\d+$/.test(invoiceIdParam);
    const lookupQuery = isBigInt ? `SELECT id, user_id, number as invoice_number FROM invoices WHERE id = $1 AND user_id = $2` : `SELECT id, user_id, number as invoice_number FROM invoices WHERE number = $1 AND user_id = $2`;

    const { rows: existingRows } = await dbClient.query(lookupQuery, [invoiceIdParam, userId]);

    if (!existingRows.length) {
      await dbClient.query("ROLLBACK");
      return res.status(404).json({ error: "Invoice not found" });
    }

    const existing = existingRows[0];
    const invoiceId = existing.id;

    await dbClient.query(
      `UPDATE invoices SET 
        client_id = $1, client_name = $2, client_address = $3, date = $4, notes = $5, 
        subtotal = $6, tax = $7, total = $8, template = $9, job_id = $10
       WHERE id = $11 AND user_id = $12`,
      [sanitized.client_id, sanitized.client_name, sanitized.client_address, sanitized.issue_date, sanitized.notes, sanitized.subtotal, sanitized.tax_amount, sanitized.total, sanitized.template, sanitized.job_id, invoiceId, userId]
    );

    await dbClient.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [invoiceId]);

    if (Array.isArray(items) && items.length) {
      for (const i of items) {
        const desc = (i.description || "").trim() || "Item";
        const qty = Number(i.qty || i.quantity) || 1;
        const price = Number(i.unit_price) || 0;
        const itemTotal = Number(i.line_total || i.total) || qty * price;
        await dbClient.query(`INSERT INTO invoice_items (invoice_id, description, qty, unit_price, line_total) VALUES ($1, $2, $3, $4, $5)`, [invoiceId, desc, qty, price, itemTotal]);
      }
    }

    await dbClient.query("COMMIT");
    res.json({ success: true, id: invoiceId, invoice_number: existing.invoice_number });
  } catch (err) {
    await dbClient.query("ROLLBACK");
    console.error("[INVOICE UPDATE ERROR]", err.message);
    res.status(500).json({ error: err.message || "Failed to update invoice" });
  } finally {
    dbClient.release();
  }
});

app.get("/api/invoices/:id", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const invoiceIdParam = req.params.id;

  try {
    const isBigInt = /^\d+$/.test(invoiceIdParam);

    const invoiceQuery = isBigInt
      ? `SELECT i.*, i.number as invoice_number, i.date as issue_date, i.tax as tax_amount, i.payment_link as payment_url, c.name as client_name, c.email as client_email, c.phone as client_phone, c.address as client_full_address FROM invoices i LEFT JOIN clients c ON i.client_id = c.id WHERE i.id = $1 AND i.user_id = $2`
      : `SELECT i.*, i.number as invoice_number, i.date as issue_date, i.tax as tax_amount, i.payment_link as payment_url, c.name as client_name, c.email as client_email, c.phone as client_phone, c.address as client_full_address FROM invoices i LEFT JOIN clients c ON i.client_id = c.id WHERE i.number = $1 AND i.user_id = $2`;

    const { rows: invoices } = await pgPool.query(invoiceQuery, [invoiceIdParam, userId]);

    if (!invoices.length) return res.status(404).json({ error: "Invoice not found" });

    const invoice = invoices[0];
    const invoiceId = invoice.id;

    const { rows: rawItems } = await pgPool.query(`SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC`, [invoiceId]);
    const items = rawItems.map((item) => ({
      id: item.id,
      invoice_id: item.invoice_id,
      description: item.description || "",
      quantity: parseFloat(item.qty || item.quantity) || 1,
      unit_price: parseFloat(item.unit_price || item.price) || 0,
      total: parseFloat(item.line_total || item.total) || 0,
      created_at: item.created_at,
    }));

    let client = null;
    if (invoice.client_id) {
      client = { id: invoice.client_id, name: invoice.client_name, email: invoice.client_email, phone: invoice.client_phone, address: invoice.client_full_address };
    }

    let job = null;
    if (invoice.job_id) {
      const { rows: jobs } = await pgPool.query(`SELECT id, client_name, address, job_type, status FROM jobs WHERE id = $1 AND user_id = $2`, [invoice.job_id, userId]);
      if (jobs.length) job = jobs[0];
    }

    const { rows: attachments } = await pgPool.query(`SELECT * FROM invoice_attachments WHERE invoice_id = $1`, [invoiceId]);

    const formatDate = (d) => {
      if (!d) return null;
      if (d instanceof Date) return d.toISOString().split("T")[0];
      if (typeof d === "string") return d.split("T")[0];
      return String(d);
    };

    res.json({ ...invoice, issue_date: formatDate(invoice.issue_date), items: items || [], client: client || null, job: job || null, attachments: attachments || [] });
  } catch (err) {
    console.error("Error fetching invoice detail:", err.message);
    res.status(500).json({ error: err.message || "Failed to fetch invoice" });
  }
});

app.post("/api/invoices/:id/archive", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const invoiceId = await resolveInvoiceId(req.params.id, userId);
    if (!invoiceId) return res.status(404).json({ error: "Invoice not found" });

    const { rows } = await pgPool.query(`UPDATE invoices SET archived = true WHERE id = $1 AND user_id = $2 RETURNING *`, [invoiceId, userId]);

    if (!rows.length) return res.status(404).json({ error: "Invoice not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to archive invoice" });
  }
});

app.post("/api/invoices/:id/unarchive", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const invoiceId = await resolveInvoiceId(req.params.id, userId);
    if (!invoiceId) return res.status(404).json({ error: "Invoice not found" });

    const { rows } = await pgPool.query(`UPDATE invoices SET archived = false WHERE id = $1 AND user_id = $2 RETURNING *`, [invoiceId, userId]);

    if (!rows.length) return res.status(404).json({ error: "Invoice not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to unarchive invoice" });
  }
});

app.delete("/api/invoices/:id", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const invoiceIdParam = req.params.id;

  try {
    const isBigInt = /^\d+$/.test(invoiceIdParam);
    let rows = [];

    if (isBigInt) {
      const result = await pgPool.query(`SELECT id FROM invoices WHERE id = $1 AND user_id = $2`, [invoiceIdParam, userId]);
      rows = result.rows;
    } else {
      const result = await pgPool.query(`SELECT id FROM invoices WHERE number = $1 AND user_id = $2`, [invoiceIdParam, userId]);
      rows = result.rows;
    }

    if (!rows.length) {
      return res.json({ success: true, note: "Already deleted or cached entry cleared" });
    }

    const invoiceId = rows[0].id;
    await pgPool.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [invoiceId]);
    await pgPool.query(`DELETE FROM invoice_attachments WHERE invoice_id = $1`, [invoiceId]);
    await pgPool.query(`DELETE FROM invoices WHERE id = $1 AND user_id = $2`, [invoiceId, userId]);

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting invoice:", err);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

app.post("/api/invoices/:id/photos", upload.array("photos"), async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const invoiceIdParam = req.params.id;
  const files = req.files || [];
  if (!files.length) return res.json({ ok: true });

  const invoiceId = await resolveInvoiceId(invoiceIdParam, userId);
  if (!invoiceId) return res.status(404).json({ error: "Invoice not found" });

  for (const file of files) {
    const pathKey = `${userId}/${invoiceId}/${Date.now()}-${file.originalname}`;

    const { error: uploadErr } = await supabaseAdmin.storage.from("invoice-photos").upload(pathKey, file.buffer, { upsert: false, contentType: file.mimetype });

    if (uploadErr) continue;

    const { data: { publicUrl } } = supabaseAdmin.storage.from("invoice-photos").getPublicUrl(pathKey);

    await pgPool.query(`INSERT INTO invoice_attachments (invoice_id, file_url, file_name) VALUES ($1, $2, $3)`, [invoiceId, publicUrl, file.originalname]);
  }

  res.json({ ok: true });
});

app.patch("/api/invoices/:id/payment-status", requireSubscription, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { payment_status } = req.body;
  const invoiceId = await resolveInvoiceId(req.params.id, userId);
  if (!invoiceId) return res.status(404).json({ error: "Invoice not found" });

  try {
    const { rows } = await pgPool.query(`UPDATE invoices SET payment_status = $1 WHERE id = $2 AND user_id = $3 RETURNING *`, [payment_status, invoiceId, userId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/invoices/:id/job", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { job_id } = req.body;
  const invoiceId = await resolveInvoiceId(req.params.id, userId);
  if (!invoiceId) return res.status(404).json({ error: "Invoice not found" });

  try {
    const { rows } = await pgPool.query(`UPDATE invoices SET job_id = $1 WHERE id = $2 AND user_id = $3 RETURNING *`, [job_id || null, invoiceId, userId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/quotes", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json([]);

  const showArchived = req.query.archived === "true";

  let query = supabaseAdmin.from("quotes").select("*").eq("user_id", userId);

  if (showArchived) {
    query = query.eq("archived", true);
  } else {
    query = query.or("archived.is.null,archived.eq.false");
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/quotes", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { client_id, client_name, client_address, quote_date, quote_number, notes, template, subtotal, tax, total, items, valid_until } = req.body;

  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");

    const quoteResult = await client.query(
      `INSERT INTO quotes (user_id, client_id, client_name, client_address, quote_date, due_date, quote_number, notes, template, subtotal, tax, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, quote_number`,
      [userId, client_id || null, client_name || null, client_address || null, quote_date || new Date().toISOString().split("T")[0], valid_until || null, quote_number || null, notes || null, template || "basic_clean", subtotal || 0, tax || 0, total || 0, "draft"]
    );

    const quote = quoteResult.rows[0];

    if (Array.isArray(items) && items.length) {
      const values = items.map((item, idx) => `($1, $${idx * 4 + 2}, $${idx * 4 + 3}, $${idx * 4 + 4}, $${idx * 4 + 5})`).join(", ");
      const params = [quote.id];
      items.forEach((item) => {
        const qty = item.qty || item.quantity || 1;
        const unitPrice = item.unit_price || item.price || 0;
        const itemTotal = item.line_total || item.total || qty * unitPrice;
        params.push(item.description || "", qty, unitPrice, itemTotal);
      });

      await client.query(`INSERT INTO quote_items (quote_id, description, quantity, unit_price, total) VALUES ${values}`, params);
    }

    await client.query("COMMIT");
    res.json({ id: quote.id, quote_number: quote.quote_number });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message || "Failed to create quote" });
  } finally {
    client.release();
  }
});

app.put("/api/quotes/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const quoteId = req.params.id;
  if (!quoteId) return res.status(400).json({ error: "Invalid quote ID" });
  const { client_id, client_name, client_address, quote_date, notes, template, subtotal, tax, total, items, valid_until } = req.body;

  const toNull = (v) => (v === "" || v === undefined || v === null ? null : v);
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const toUUID = (v) => (!v || !isValidUUID.test(v) ? null : v);

  const dbClient = await pgPool.connect();
  try {
    await dbClient.query("BEGIN");

    const { rows: existing } = await dbClient.query("SELECT id FROM quotes WHERE id = $1 AND user_id = $2", [quoteId, userId]);

    if (!existing.length) {
      await dbClient.query("ROLLBACK");
      dbClient.release();
      return res.status(404).json({ error: "Quote not found" });
    }

    const { rows: updated } = await dbClient.query(
      `UPDATE quotes SET 
        client_id = $1, client_name = COALESCE($2, client_name), client_address = COALESCE($3, client_address),
        quote_date = COALESCE($4, quote_date), due_date = COALESCE($5, due_date), subtotal = $6, tax = $7, total = $8,
        notes = COALESCE($9, notes), template = COALESCE($10, template)
       WHERE id = $11 AND user_id = $12 RETURNING *`,
      [toUUID(client_id), toNull(client_name), toNull(client_address), toNull(quote_date), toNull(valid_until), subtotal || 0, tax || 0, total || 0, toNull(notes), template || null, quoteId, userId]
    );

    const quote = updated[0];
    if (!quote) {
      await dbClient.query("ROLLBACK");
      dbClient.release();
      return res.status(500).json({ error: "Failed to update quote" });
    }

    await dbClient.query(`DELETE FROM quote_items WHERE quote_id = $1`, [quoteId]);

    if (items && items.length) {
      for (const it of items) {
        const qty = it.qty || it.quantity || 1;
        const unitPrice = it.unit_price || 0;
        const itemTotal = it.line_total || it.total || qty * unitPrice;
        await dbClient.query(`INSERT INTO quote_items (quote_id, description, quantity, unit_price, total) VALUES ($1, $2, $3, $4, $5)`, [quote.id, it.description || "", qty, unitPrice, itemTotal]);
      }
    }

    await dbClient.query("COMMIT");
    res.json({ ...quote, items });
  } catch (err) {
    await dbClient.query("ROLLBACK");
    res.status(500).json({ error: err.message || "Failed to update quote" });
  } finally {
    dbClient.release();
  }
});

app.get("/api/quotes/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const quoteId = req.params.id;
  if (!quoteId) return res.status(400).json({ error: "Invalid quote ID" });

  try {
    const { rows: quotes } = await pgPool.query(`SELECT q.*, c.name as client_name_joined, c.email as client_email, c.phone as client_phone FROM quotes q LEFT JOIN clients c ON q.client_id = c.id WHERE q.id = $1 AND q.user_id = $2`, [quoteId, userId]);

    if (!quotes.length) return res.status(404).json({ error: "Quote not found" });

    const quote = quotes[0];
    const { rows: items } = await pgPool.query(`SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY id ASC`, [quoteId]);

    let job = null;
    if (quote.job_id) {
      const { rows: jobs } = await pgPool.query(`SELECT id, client_name, address, job_type, status FROM jobs WHERE id = $1 AND user_id = $2`, [quote.job_id, userId]);
      if (jobs.length) job = jobs[0];
    }

    res.json({ ...quote, items: items || [], job: job || null });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch quote" });
  }
});

app.post("/api/quotes/:id/archive", requireAuth, async (req, res) => {
  const userId = req.userId;
  const quoteId = req.params.id;
  if (!quoteId) return res.status(400).json({ error: "Invalid quote ID" });

  try {
    const { rows } = await pgPool.query(`UPDATE quotes SET archived = true WHERE id = $1 AND user_id = $2 RETURNING *`, [quoteId, userId]);
    if (!rows.length) return res.status(404).json({ error: "Quote not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to archive quote" });
  }
});

app.post("/api/quotes/:id/unarchive", requireAuth, async (req, res) => {
  const userId = req.userId;
  const quoteId = req.params.id;
  if (!quoteId) return res.status(400).json({ error: "Invalid quote ID" });

  try {
    const { rows } = await pgPool.query(`UPDATE quotes SET archived = false WHERE id = $1 AND user_id = $2 RETURNING *`, [quoteId, userId]);
    if (!rows.length) return res.status(404).json({ error: "Quote not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to unarchive quote" });
  }
});

app.delete("/api/quotes/:id", requireAuth, async (req, res) => {
  const userId = req.userId;
  const quoteId = req.params.id;
  if (!quoteId) return res.status(400).json({ error: "Invalid quote ID" });

  const dbClient = await pgPool.connect();
  try {
    await dbClient.query("BEGIN");

    const { rows: existing } = await dbClient.query("SELECT id FROM quotes WHERE id = $1 AND user_id = $2", [quoteId, userId]);
    if (!existing.length) {
      await dbClient.query("ROLLBACK");
      return res.json({ success: true, note: "Already deleted" });
    }

    await dbClient.query("DELETE FROM quote_items WHERE quote_id = $1", [quoteId]);
    await dbClient.query("DELETE FROM quotes WHERE id = $1 AND user_id = $2", [quoteId, userId]);

    await dbClient.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await dbClient.query("ROLLBACK");
    res.status(500).json({ error: "Failed to delete quote" });
  } finally {
    dbClient.release();
  }
});

app.patch("/api/quotes/:id/job", requireAuth, async (req, res) => {
  const userId = req.userId;
  const quoteId = req.params.id;
  if (!quoteId) return res.status(400).json({ error: "Invalid quote ID" });

  const { job_id } = req.body;

  try {
    const { rows } = await pgPool.query(`UPDATE quotes SET job_id = $1 WHERE id = $2 AND user_id = $3 RETURNING *`, [job_id || null, quoteId, userId]);
    if (!rows.length) return res.status(404).json({ error: "Quote not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/referrals/summary", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.json({ total_earnings: 0, pending: 0, paid: 0, referral_count: 0 });

  try {
    const { data: profile } = await supabaseAdmin.from("profiles").select("referral_code").eq("id", userId).single();
    if (!profile?.referral_code) return res.json({ total_earnings: 0, pending: 0, paid: 0, referral_count: 0 });

    const { rows } = await pgPool.query(`SELECT * FROM referral_earnings WHERE referrer_id = $1`, [userId]);

    const total = rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    const pending = rows.filter((r) => r.status === "pending").reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    const paid = rows.filter((r) => r.status === "paid").reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    res.json({ total_earnings: total, pending, paid, referral_count: rows.length, referral_code: profile.referral_code });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/invites/stats", requireAuth, async (req, res) => {
  const userId = req.userId;
  try {
    const { data: profile } = await supabaseAdmin.from("profiles").select("referral_code, invites_sent, referral_bonus_days").eq("id", userId).single();

    const { rows } = await pgPool.query(`SELECT COUNT(*) as count FROM profiles WHERE referred_by = $1`, [profile?.referral_code || ""]);
    const signups = parseInt(rows[0]?.count || "0");

    res.json({ invites_sent: profile?.invites_sent || 0, successful_signups: signups, bonus_days: profile?.referral_bonus_days || 0, referral_code: profile?.referral_code || "" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/invites/send", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const { data: profile } = await supabaseAdmin.from("profiles").select("referral_code, business_name, invites_sent").eq("id", userId).single();

    const referralCode = profile?.referral_code || makeReferralCode(userId);
    const signupLink = `${process.env.REPLIT_DEV_DOMAIN || "https://tradebase.app"}/app?ref=${referralCode}`;

    const result = await sendEmail({
      to: email,
      subject: `${profile?.business_name || "A friend"} invited you to TradeBase`,
      html: `<p>You've been invited to try TradeBase, the app for tradespeople.</p><p><a href="${signupLink}">Sign up here</a></p>`,
    });

    if (!result.success) return res.status(500).json({ error: "Failed to send invite" });

    await pgPool.query(`UPDATE profiles SET invites_sent = COALESCE(invites_sent, 0) + 1 WHERE id = $1`, [userId]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/ai/status", requireAuth, async (req, res) => {
  const userId = req.userId;

  try {
    const { data: profile } = await supabaseAdmin.from("profiles").select("ai_enabled, ai_plan, ai_subscription_id, ai_actions_used, ai_actions_limit, ai_billing_cycle_start").eq("id", userId).single();

    const cycleStart = new Date(profile?.ai_billing_cycle_start || Date.now());
    const now = new Date();
    const monthsPassed = (now.getFullYear() - cycleStart.getFullYear()) * 12 + (now.getMonth() - cycleStart.getMonth());

    let actionsUsed = profile?.ai_actions_used || 0;
    let billingCycleStart = cycleStart;

    if (monthsPassed >= 1 && profile?.ai_enabled) {
      actionsUsed = 0;
      billingCycleStart = now;
      await pgPool.query(`UPDATE profiles SET ai_actions_used = 0, ai_billing_cycle_start = $1 WHERE id = $2`, [now.toISOString(), userId]);
    }

    const resetDate = new Date(billingCycleStart);
    resetDate.setMonth(resetDate.getMonth() + 1);

    res.json({
      ai_enabled: profile?.ai_enabled || false,
      ai_plan: profile?.ai_plan || null,
      has_subscription: !!profile?.ai_subscription_id,
      usage: {
        actions_used: actionsUsed,
        actions_limit: profile?.ai_actions_limit || 300,
        reset_date: resetDate.toISOString(),
        warning_threshold: 250,
        is_at_limit: actionsUsed >= (profile?.ai_actions_limit || 300),
        is_warning: actionsUsed >= 250 && actionsUsed < (profile?.ai_actions_limit || 300),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to check AI status" });
  }
});

app.get("/api/payments/stats", requireSubscription, async (req, res) => {
  const userId = req.userId;
  try {
    const { rows: invoices } = await pgPool.query(`SELECT total, payment_status FROM invoices WHERE user_id = $1`, [userId]);

    const paid = invoices.filter((i) => i.payment_status === "paid").reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
    const unpaid = invoices.filter((i) => i.payment_status !== "paid").reduce((sum, i) => sum + parseFloat(i.total || 0), 0);

    res.json({ total_paid: paid, total_unpaid: unpaid, invoice_count: invoices.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/send-signup-confirmation", async (req, res) => {
  const { email, userId } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    if (userId) {
      const { error: confirmErr } = await supabaseAdminRaw.auth.admin.updateUserById(userId, {
        email_confirm: true
      });
      if (confirmErr) {
        console.error("[Signup] Failed to auto-confirm user:", confirmErr.message);
      } else {
        console.log("[Signup] User auto-confirmed:", userId);
      }
    }

    const appUrl = "https://trade-base.biz";

    const result = await sendEmail({
      to: email,
      subject: "Welcome to Skippy Stack!",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Skippy Stack</h1>
            <p style="color: #666; margin: 5px 0;">Invoice & Business Management for Tradespeople</p>
          </div>
          <div style="background: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #111;">Welcome aboard!</h2>
            <p style="color: #333; line-height: 1.6;">Your account is ready to go. You can log in right now and start using Skippy Stack.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${appUrl}" style="background: #2563eb; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">Log In Now</a>
            </div>
            <p style="color: #333; line-height: 1.6;">Your 14-day free trial includes:</p>
            <ul style="color: #333; line-height: 1.8;">
              <li>Create professional invoices and quotes</li>
              <li>Manage clients and jobs</li>
              <li>Send quotes via SMS</li>
              <li>Track payments</li>
            </ul>
          </div>
          <div style="text-align: center; padding: 20px;">
            <p style="color: #999; font-size: 12px;">Skippy Stack - Built for tradespeople</p>
          </div>
        </div>
      `
    });

    if (result.success) {
      console.log("[Signup] Welcome email sent to:", email);
      res.json({ success: true, confirmed: true });
    } else {
      console.error("[Signup] Failed to send welcome email:", result.error);
      res.json({ success: false, confirmed: true, emailError: result.error });
    }
  } catch (err) {
    console.error("[Signup] Error:", err);
    res.status(500).json({ error: "Failed to process signup confirmation" });
  }
});

app.get("/confirm-signup", async (req, res) => {
  res.sendFile(path.join(__dirname, "confirm-signup.html"));
});

app.get("/api/public/invoice/:id", async (req, res) => {
  const invoiceId = req.params.id;
  if (!invoiceId) return res.status(400).json({ error: "Invalid invoice ID" });

  try {
    const { rows: invoices } = await pgPool.query(
      `SELECT i.*, 
        i.number as invoice_number,
        TO_CHAR(i.date, 'YYYY-MM-DD') as issue_date,
        i.tax as tax_amount,
        COALESCE(i.client_name, c.name) as client_name,
        c.email as client_email, c.phone as client_phone
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.id = $1`,
      [invoiceId]
    );

    if (!invoices.length) return res.status(404).json({ error: "Invoice not found" });

    const invoice = invoices[0];
    const { rows: items } = await pgPool.query(`SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC`, [invoiceId]);

    const { rows: profiles } = await pgPool.query(`SELECT business_name, business_address, business_phone, logo_url, business_website FROM profiles WHERE id = $1`, [invoice.user_id]);
    const profile = profiles[0] || {};

    res.json({
      ...invoice,
      items: items || [],
      business_name: profile.business_name || '',
      address: profile.business_address || '',
      phone: profile.business_phone || '',
      logo_url: profile.logo_url || '',
      website: profile.business_website || ''
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

app.get("/api/public/quote/:id", async (req, res) => {
  const quoteId = req.params.id;
  if (!quoteId) return res.status(400).json({ error: "Invalid quote ID" });

  try {
    const { rows: quotes } = await pgPool.query(
      `SELECT q.*, c.name as client_name_joined, c.email as client_email, c.phone as client_phone
      FROM quotes q
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE q.id = $1`,
      [quoteId]
    );

    if (!quotes.length) return res.status(404).json({ error: "Quote not found" });

    const quote = quotes[0];
    const { rows: items } = await pgPool.query(`SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY id ASC`, [quoteId]);

    const { rows: profiles } = await pgPool.query(`SELECT business_name, business_address, business_phone, logo_url, business_website FROM profiles WHERE id = $1`, [quote.user_id]);
    const profile = profiles[0] || {};

    res.json({
      ...quote,
      client_name: quote.client_name || quote.client_name_joined,
      items: items || [],
      business_name: profile.business_name || '',
      address: profile.business_address || '',
      phone: profile.business_phone || '',
      logo_url: profile.logo_url || '',
      website: profile.business_website || ''
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

app.get("/view/invoice/:id", async (req, res) => {
  res.sendFile(path.join(__dirname, "public-invoice.html"));
});

app.get("/view/quote/:id", async (req, res) => {
  res.sendFile(path.join(__dirname, "public-quote.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`[TradeBase v${BUILD_VERSION}] Server running on port ${port}`);
  console.log(`[TradeBase] Build ID: ${BUILD_ID}`);
});
