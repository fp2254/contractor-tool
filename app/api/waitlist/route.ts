import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient } from "@/lib/email";

function waitlistConfirmationHtml(firstName: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1B3A6B;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:22px">TradeBase</h1>
      <p style="margin:4px 0 0;color:#94b4e0;font-size:13px">Early Access Waitlist</p>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 16px;font-size:15px;color:#334155">Hi ${firstName},</p>
      <p style="margin:0 0 16px;font-size:15px;color:#64748b">
        You&rsquo;re on the TradeBase waitlist. We&rsquo;ll let you know when early access opens.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b">
        TradeBase is being built for contractors who want a simpler way to handle quotes, jobs, invoices, receipts, inventory, and more — all from their phone.
      </p>
      <div style="background:#f0f4ff;border-radius:10px;padding:16px 20px;margin-bottom:24px">
        <p style="margin:0;font-size:13px;font-weight:bold;color:#1B3A6B">What to expect:</p>
        <ul style="margin:8px 0 0;padding-left:18px;font-size:13px;color:#64748b;line-height:1.7">
          <li>Early access invite when we launch</li>
          <li>Founder pricing locked in at $15/month</li>
          <li>Occasional updates as we build</li>
        </ul>
      </div>
      <p style="margin:0;font-size:14px;color:#94a3b8">Thanks for joining,<br><strong style="color:#1B3A6B">The TradeBase Team</strong></p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center">
      <p style="margin:0;font-size:12px;color:#94a3b8">
        <a href="https://trade-base.biz" style="color:#94a3b8;text-decoration:underline">TradeBase</a>
        &middot; Built for contractors
      </p>
    </div>
  </div>
</body></html>`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
      trade?: string;
      company?: string;
      state?: string;
      pain_point?: string;
      source?: string;
      referred_by?: string;
    };

    if (!body.first_name?.trim() || !body.last_name?.trim() || !body.email?.trim()) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const referredBy = body.referred_by?.trim().toUpperCase() || null;
    const source = referredBy ? `ref:${referredBy}` : (body.source?.trim() || "website");

    const insertData: Record<string, string | null> = {
      first_name: body.first_name.trim(),
      last_name: body.last_name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone?.trim() ?? null,
      trade_type: body.trade?.trim() ?? null,
      state: body.state?.trim() ?? null,
      pain_point: body.pain_point?.trim() ?? null,
      source,
    };

    if (body.company?.trim()) {
      insertData.company_name = body.company.trim();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { error } = await (admin as any)
      .from("waitlist")
      .insert(insertData);

    // If any optional column doesn't exist in the schema, fall back to core fields only
    if (error?.code === "PGRST204") {
      const retry = await (admin as any).from("waitlist").insert({
        first_name: insertData.first_name,
        last_name: insertData.last_name,
        email: insertData.email,
        source,
      });
      error = retry.error;
    }

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "That email is already on the waitlist." }, { status: 409 });
      }
      console.error("Waitlist insert error:", error);
      return NextResponse.json({ error: "Failed to save your spot. Please try again." }, { status: 500 });
    }

    try {
      const { client, fromEmail } = await getResendClient();
      await client.emails.send({
        from: fromEmail,
        to: body.email.trim().toLowerCase(),
        subject: "You're on the TradeBase waitlist",
        html: waitlistConfirmationHtml(body.first_name.trim()),
      });
    } catch (emailErr) {
      console.error("Waitlist confirmation email failed (non-fatal):", emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Waitlist route error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
