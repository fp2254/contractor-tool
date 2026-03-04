import { Resend } from "resend";

async function getCredentials(): Promise<{ apiKey: string; fromEmail: string }> {
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
    fromEmail: (settings.from_email as string | undefined) ?? "quotes@tradebase.app",
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
      <p style="margin:0;font-size:12px;color:#94a3b8">Sent via TradeBase</p>
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
      <p style="margin:0;font-size:12px;color:#94a3b8">Powered by TradeBase</p>
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
      <p style="margin:24px 0 0;font-size:15px;color:#64748b">Thank you,<br><strong>${opts.businessName}</strong></p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center">
      <p style="margin:0;font-size:12px;color:#94a3b8">Sent via TradeBase</p>
    </div>
  </div>
</body></html>`;
}
