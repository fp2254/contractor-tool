import { NextRequest, NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await req.json().catch(() => ({}));
  const message = body.message || "Contractor requested access to the AI Phone add-on.";

  const admin = createAdminClient();

  // Save as a support ticket so admin sees it
  await (admin as any).from("support_tickets").insert({
    org_id: orgId,
    user_id: user?.id ?? null,
    subject: "[ADDON_REQUEST] AI Phone Receptionist",
    body: `${message}\n\nOrg ID: ${orgId}\nUser: ${user?.email ?? "unknown"}`,
    status: "open",
  }).select().maybeSingle();

  // Try to email admin (best-effort)
  try {
    const { getResendClient } = await import("@/lib/email");
    const { client, fromEmail } = await getResendClient();
    const adminEmail = process.env.ADMIN_EMAIL?.split(",")[0]?.trim();
    if (adminEmail) {
      await client.emails.send({
        from: `TradeBase <${fromEmail}>`,
        to: [adminEmail],
        subject: `[Add-on Request] AI Phone — org ${orgId}`,
        html: `<p>A contractor has requested the AI Phone add-on.</p>
               <p><strong>Org ID:</strong> ${orgId}</p>
               <p><strong>User:</strong> ${user?.email ?? "unknown"}</p>
               <p><strong>Message:</strong> ${message}</p>
               <p>Visit <a href="${process.env.APP_BASE_URL ?? ""}/app/admin/addons">Admin Addons</a> to activate.</p>`,
      });
    }
  } catch {
    // Email failure is non-fatal
  }

  return NextResponse.json({ success: true });
}
