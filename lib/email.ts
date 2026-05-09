import { Resend } from "resend";

export function inviteEmailHtml(opts: {
  firstName: string;
  inviteUrl: string;
}): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1B3A6B;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:22px">TradeBase</h1>
      <p style="margin:4px 0 0;color:#94b4e0;font-size:13px">You're invited</p>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 16px;font-size:15px;color:#334155">Hi ${opts.firstName},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b">You've been invited to TradeBase — the all-in-one platform built for tradespeople. Click below to set up your account.</p>
      <a href="${opts.inviteUrl}"
        style="display:block;background:#1B3A6B;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:bold;margin-bottom:24px">
        Set Up My Account
      </a>
      <p style="margin:0;font-size:13px;color:#94a3b8">This invite link expires in 24 hours. If you didn't expect this, you can safely ignore it.</p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center">
      <p style="margin:0;font-size:12px;color:#94a3b8">TradeBase &middot; Built for contractors</p>
    </div>
  </div>
</body></html>`;
}

async function getCredentials(): Promise<{ apiKey: string; fromEmail: string }> {
  // Prefer explicit env var (overrides integration connector)
  if (process.env.RESEND_API_KEY) {
    return {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL ?? "no-reply@tradebase.contractors",
    };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) throw new Error("X-Replit-Token not found");

  const data = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  ).then((r) => r.json());

  const settings = data.items?.[0]?.settings;
  if (!settings?.api_key) throw new Error("Resend not connected — check integration settings");

  return {
    apiKey: settings.api_key as string,
    fromEmail: (settings.from_email as string | undefined) ?? "no-reply@tradebase.contractors",
  };
}

// WARNING: Never cache — tokens expire.
export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return { client: new Resend(apiKey), fromEmail };
}

export function quoteEmailHtml(opts: {
  businessName: string;
  customerFirstName: string;
  quoteNum: string;
  total: number;
  lineItems: { description: string; quantity: number; total_price: number }[];
  notes?: string | null;
}): string {
  const items = opts.lineItems
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155">${i.description} × ${i.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;text-align:right">$${Number(i.total_price).toFixed(2)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1B3A6B;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:22px">${opts.businessName}</h1>
      <p style="margin:4px 0 0;color:#94b4e0;font-size:13px">Quote Estimate</p>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 16px;font-size:15px;color:#334155">Hi ${opts.customerFirstName},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b">Thank you for your interest. Please find your estimate below. A PDF copy is attached for your records.</p>
      <p style="margin:0 0 12px;font-size:13px;font-weight:bold;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Quote ${opts.quoteNum}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        ${items}
      </table>
      <div style="background:#1B3A6B;border-radius:8px;padding:12px 16px;text-align:right">
        <span style="color:#94b4e0;font-size:13px;margin-right:16px">Total</span>
        <span style="color:#fff;font-size:18px;font-weight:bold">$${Number(opts.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
      </div>
      ${opts.notes ? `<p style="margin:20px 0 0;font-size:14px;color:#64748b;background:#f8fafc;padding:12px 16px;border-left:3px solid #1B3A6B;border-radius:4px">${opts.notes}</p>` : ""}
      <p style="margin:24px 0 0;font-size:15px;color:#334155">Please review and let us know if you'd like to move forward.</p>
      <p style="margin:8px 0 0;font-size:15px;color:#64748b">Thanks,<br><strong>${opts.businessName}</strong></p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center">
      <p style="margin:0;font-size:12px;color:#94a3b8">Sent using <a href="https://trade-base.biz" style="color:#94a3b8;text-decoration:underline">TradeBase</a> &middot; Built for contractors</p>
    </div>
  </div>
</body></html>`;
}

export function portalEmailHtml(opts: {
  businessName: string;
  customerFirstName: string;
  portalUrl: string;
  phone?: string | null;
}): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1B3A6B;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:22px">${opts.businessName}</h1>
      <p style="margin:4px 0 0;color:#94b4e0;font-size:13px">Your Customer Portal</p>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 16px;font-size:15px;color:#334155">Hi ${opts.customerFirstName},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b">${opts.businessName} has shared your documents with you. Click below to view your estimates and invoices, download PDFs, and accept or decline quotes.</p>
      <a href="${opts.portalUrl}"
        style="display:block;background:#1B3A6B;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:bold;margin-bottom:24px">
        View My Documents
      </a>
      <p style="margin:0;font-size:13px;color:#94a3b8">This link is valid for 30 days. If you have questions, contact us${opts.phone ? ` at ${opts.phone}` : ""}.</p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center">
      <p style="margin:0;font-size:12px;color:#94a3b8">Documents delivered with <a href="https://trade-base.biz" style="color:#94a3b8;text-decoration:underline">TradeBase</a> &middot; Built for contractors</p>
    </div>
  </div>
</body></html>`;
}

export function closeoutEmailHtml(opts: {
  businessName: string;
  customerFirstName: string;
  jobTitle: string;
  jobAddress: string | null;
  completedDate: string;
  invoiceLines: { description: string; quantity: number; total: number }[];
  effectiveTotal: number;
  customerNote: string | null;
  warrantyTitle: string;
  warrantyBody: string;
}): string {
  const lineRows = opts.invoiceLines
    .map(l => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155">${l.description}${l.quantity !== 1 ? ` × ${l.quantity}` : ""}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:${l.total < 0 ? "#16a34a" : "#334155"};text-align:right">${l.total < 0 ? "-" : ""}$${Math.abs(l.total).toFixed(2)}</td>
      </tr>`)
    .join("");

  const warrantyLines = opts.warrantyBody
    .split("\n")
    .filter(l => l.trim())
    .map(l => `<p style="margin:0 0 8px;font-size:13px;color:#475569">• ${l.trim()}</p>`)
    .join("");

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1B3A6B;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:22px">${opts.businessName}</h1>
      <p style="margin:4px 0 0;color:#94b4e0;font-size:13px">Job Complete — ${opts.jobTitle}</p>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 8px;font-size:15px;color:#334155">Hi ${opts.customerFirstName},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b">Your job has been completed. Please find your job summary, invoice, and warranty below.</p>

      <!-- Job Summary -->
      <div style="background:#f8fafc;border-radius:8px;padding:14px 16px;margin-bottom:24px">
        <p style="margin:0 0 4px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8">Job Summary</p>
        <p style="margin:4px 0;font-size:14px;color:#334155"><strong>${opts.jobTitle}</strong></p>
        ${opts.jobAddress ? `<p style="margin:2px 0;font-size:13px;color:#64748b">📍 ${opts.jobAddress}</p>` : ""}
        <p style="margin:2px 0;font-size:13px;color:#64748b">✓ Completed ${opts.completedDate}</p>
      </div>

      <!-- Invoice -->
      <p style="margin:0 0 12px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8">Invoice</p>
      ${lineRows.length ? `<table style="width:100%;border-collapse:collapse;margin-bottom:12px">${lineRows}</table>` : ""}
      <div style="background:#1B3A6B;border-radius:8px;padding:12px 16px;text-align:right;margin-bottom:${opts.customerNote ? "12px" : "24px"}">
        <span style="color:#94b4e0;font-size:13px;margin-right:16px">Total Due</span>
        <span style="color:#fff;font-size:18px;font-weight:bold">$${Number(opts.effectiveTotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
      </div>
      ${opts.customerNote ? `<p style="margin:0 0 24px;font-size:14px;color:#64748b;background:#f0f9ff;padding:12px 16px;border-left:3px solid #1B3A6B;border-radius:4px">${opts.customerNote}</p>` : ""}

      <!-- Warranty -->
      ${opts.warrantyBody ? `
      <p style="margin:0 0 12px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8">${opts.warrantyTitle || "Warranty & Terms"}</p>
      <div style="background:#f0fdf4;border-radius:8px;padding:14px 16px;border-left:3px solid #22c55e;margin-bottom:24px">
        ${warrantyLines}
      </div>` : ""}

      <p style="margin:0;font-size:14px;color:#64748b">Thank you for your business.<br><strong>${opts.businessName}</strong></p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center">
      <p style="margin:0;font-size:12px;color:#94a3b8">Sent with <a href="https://tradebase.contractors" style="color:#94a3b8;text-decoration:underline">TradeBase</a> &middot; Built for contractors</p>
    </div>
  </div>
</body></html>`;
}

export function invoiceEmailHtml(opts: {
  businessName: string;
  customerFirstName: string;
  invoiceNum: string;
  total: number;
  dueDate: string | null;
  lineItems: { description: string; quantity: number; total_price: number }[];
  paymentMethods?: string | null;
  photos?: { url: string; filename: string }[];
}): string {
  const items = opts.lineItems
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155">${i.description} × ${i.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;text-align:right">$${Number(i.total_price).toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const due = opts.dueDate
    ? new Date(opts.dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "Upon Receipt";

  const methods = opts.paymentMethods
    ? opts.paymentMethods.split(",").map(m => m.trim().charAt(0).toUpperCase() + m.trim().slice(1)).join(", ")
    : "Cash, Check, Card";

  const photoGrid = opts.photos && opts.photos.length > 0
    ? `<div style="margin-top:24px">
        <p style="margin:0 0 10px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8">Job Photos (${opts.photos.length})</p>
        <table style="width:100%;border-collapse:collapse">
          <tr>${opts.photos.slice(0, 6).map((p, i) => `
            ${i > 0 && i % 3 === 0 ? '</tr><tr>' : ''}
            <td style="width:33%;padding:3px;vertical-align:top">
              <a href="${p.url}" target="_blank" style="display:block">
                <img src="${p.url}" alt="${p.filename}" width="160" style="width:100%;height:100px;object-fit:cover;border-radius:6px;display:block" />
              </a>
            </td>`).join("")}
          </tr>
        </table>
        ${opts.photos.length > 6 ? `<p style="margin:8px 0 0;font-size:12px;color:#94a3b8;text-align:center">+ ${opts.photos.length - 6} more photos on file</p>` : ""}
      </div>`
    : "";

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1B3A6B;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:22px">${opts.businessName}</h1>
      <p style="margin:4px 0 0;color:#94b4e0;font-size:13px">Invoice ${opts.invoiceNum}</p>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 16px;font-size:15px;color:#334155">Hi ${opts.customerFirstName},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b">Thank you for your business. Please find your invoice attached. Payment is due <strong>${due}</strong>.</p>
      ${items.length ? `<table style="width:100%;border-collapse:collapse;margin-bottom:16px">${items}</table>` : ""}
      <div style="background:#1B3A6B;border-radius:8px;padding:12px 16px;text-align:right;margin-bottom:16px">
        <span style="color:#94b4e0;font-size:13px;margin-right:16px">Amount Due</span>
        <span style="color:#fff;font-size:18px;font-weight:bold">$${Number(opts.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
      </div>
      <div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;border-left:3px solid #22c55e">
        <p style="margin:0;font-size:13px;font-weight:bold;color:#166534">Accepted Payment Methods</p>
        <p style="margin:4px 0 0;font-size:13px;color:#15803d">${methods}</p>
      </div>
      ${photoGrid}
      <p style="margin:24px 0 0;font-size:15px;color:#64748b">Thank you,<br><strong>${opts.businessName}</strong></p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center">
      <p style="margin:0;font-size:12px;color:#94a3b8">Invoice powered by <a href="https://tradebase.contractors" style="color:#94a3b8;text-decoration:underline">TradeBase</a> &middot; Built for contractors</p>
    </div>
  </div>
</body></html>`;
}
