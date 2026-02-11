import { Resend } from "resend";

async function getResendCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken || !hostname) {
    if (process.env.RESEND_API_KEY) {
      return { apiKey: process.env.RESEND_API_KEY, fromEmail: process.env.EMAIL_FROM || "TradeBase <noreply@resend.dev>" };
    }
    return null;
  }

  try {
    const res = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );
    const data = await res.json();
    const conn = data.items?.[0];
    if (!conn || !conn.settings?.api_key) {
      return null;
    }
    return { apiKey: conn.settings.api_key, fromEmail: conn.settings.from_email || "TradeBase <noreply@resend.dev>" };
  } catch (err) {
    console.error("[Email] Failed to get Resend credentials:", err.message);
    return null;
  }
}

export async function sendEmail({ to, subject, html, from }) {
  const creds = await getResendCredentials();
  if (!creds) {
    console.error("[Email] No Resend credentials available");
    return { success: false, error: "Email service not configured" };
  }

  const client = new Resend(creds.apiKey);
  const fromEmail = from || creds.fromEmail;

  try {
    const result = await client.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });
    console.log("[Email] Sent to:", to, "Subject:", subject);
    return { success: true, data: result };
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return { success: false, error: error.message };
  }
}
