import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getResendClient } from "@/lib/email";
import { requirePlatformAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;
  const userEmail = user.email ?? null;

  const body = await req.json() as {
    type: string;
    title: string;
    description: string;
    screenshot_url?: string | null;
  };

  if (!body.type || !body.title?.trim() || !body.description?.trim()) {
    return NextResponse.json({ error: "type, title, and description are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: ticket, error } = await (admin as any)
    .from("support_tickets")
    .insert({
      user_id: userId,
      user_email: userEmail,
      type: body.type,
      title: body.title.trim(),
      description: body.description.trim(),
      screenshot_url: body.screenshot_url ?? null,
      status: "open",
      priority: "low",
    })
    .select()
    .single();

  if (error) {
    console.error("[support] insert error:", error.message);
    return NextResponse.json(
      { error: "Failed to save ticket. Run scripts/support-tickets-setup.sql in Supabase Studio first." },
      { status: 500 }
    );
  }

  // Send admin notification email (non-blocking)
  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.PLATFORM_ADMIN_EMAILS?.split(",")[0]?.trim();
  if (adminEmail) {
    try {
      const { client, fromEmail } = await getResendClient();
      const typeLabel = body.type === "bug" ? "🐛 Bug Report" : body.type === "feature" ? "💡 Feature Request" : "💬 General Feedback";
      const { error: sendError } = await client.emails.send({
        from: fromEmail,
        to: adminEmail,
        subject: `[TradeBase Support] ${typeLabel}: ${body.title}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
            <div style="background:#1B3A6B;padding:20px 24px">
              <h2 style="margin:0;color:#fff;font-size:18px">${typeLabel}</h2>
              <p style="margin:4px 0 0;color:#94b4e0;font-size:13px">New support ticket — TradeBase</p>
            </div>
            <div style="padding:24px">
              <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Title</p>
              <p style="margin:0 0 16px;font-size:15px;color:#1e293b;font-weight:600">${body.title}</p>
              <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Description</p>
              <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6;white-space:pre-wrap">${body.description}</p>
              ${body.screenshot_url ? `<p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Screenshot</p><p style="margin:0 0 16px"><a href="${body.screenshot_url}" style="color:#1B3A6B">View screenshot</a></p>` : ""}
              <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin-top:8px">
                <p style="margin:0;font-size:12px;color:#64748b">From: ${userEmail ?? "Unknown"} &nbsp;·&nbsp; Ticket ID: ${ticket?.id ?? "—"}</p>
              </div>
              <p style="margin:20px 0 0"><a href="https://tradebase.contractors/app/admin/support" style="background:#1B3A6B;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">View in Admin Panel</a></p>
            </div>
          </div>`,
      });
      if (sendError) console.error("[support] Resend send error:", sendError);
    } catch (emailErr) {
      console.error("[support] email notification failed:", emailErr);
    }
  }

  return NextResponse.json({ ok: true, id: ticket?.id });
}

export async function GET() {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  try {
    const { data } = await (admin as any)
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    return NextResponse.json({ tickets: data ?? [] });
  } catch {
    return NextResponse.json({ tickets: [] });
  }
}
