import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient } from "@/lib/email";

export async function POST(req: Request) {
  const { email } = await req.json() as { email?: string };

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: "https://tradebase.contractors/auth/confirm",
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("[forgot-password] generateLink error:", linkError?.message);
    return NextResponse.json(
      { error: linkError?.message ?? "Could not generate reset link" },
      { status: 400 }
    );
  }

  const resetUrl = linkData.properties.action_link;
  console.log("[forgot-password] Generated reset URL:", resetUrl);

  try {
    const { client: resend, fromEmail } = await getResendClient();
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Reset Your TradeBase Password",
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1B3A6B;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:22px">TradeBase</h1>
      <p style="margin:4px 0 0;color:#94b4e0;font-size:13px">Password Reset</p>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 16px;font-size:15px;color:#334155">We received a request to reset your password.</p>
      <a href="${resetUrl}"
        style="display:block;background:#1B3A6B;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:bold;margin-bottom:24px">
        Reset Password
      </a>
      <p style="margin:0;font-size:13px;color:#94a3b8">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center">
      <p style="margin:0;font-size:12px;color:#94a3b8">TradeBase &middot; Built for contractors</p>
    </div>
  </div>
</body></html>`,
    });
  } catch (emailErr) {
    console.error("[forgot-password] Resend error:", emailErr);
    return NextResponse.json({ error: "Could not send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
