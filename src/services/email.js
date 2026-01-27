import { Resend } from "resend";

let resend = null;

function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendEmail({ to, subject, html, from }) {
  const client = getResend();
  if (!client) {
    console.error("[Email] No Resend API key configured");
    return { success: false, error: "Email service not configured" };
  }
  
  const fromEmail = from || process.env.EMAIL_FROM || "TradeBase <noreply@resend.dev>";
  
  try {
    const result = await client.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });
    return { success: true, data: result };
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return { success: false, error: error.message };
  }
}

export { getResend as resend };
