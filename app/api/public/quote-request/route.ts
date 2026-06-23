import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, homeownerLeadNotificationHtml } from "@/lib/email";
import { maybeSendAutoReply } from "@/lib/ai/sms-trigger";

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      slug: string;
      name: string;
      phone: string;
      email?: string;
      address?: string;
      description: string;
    };

    const { slug, name, phone, email, address, description } = body;

    if (!slug || !name?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Look up the org from the public profile slug
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pub } = await (admin as any)
      .from("public_profiles")
      .select("org_id, trade")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!pub?.org_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Insert lead
    const { data: lead, error } = await admin.from("leads").insert({
      org_id: pub.org_id,
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      notes: description?.trim() ? `[Website Quote Request]\n\n${description.trim()}` : null,
      lead_source: "Website",
      status: "new",
    }).select("id").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fire-and-forget auto-reply SMS (if org has AI assistant + phone configured)
    if (lead?.id) {
      maybeSendAutoReply(pub.org_id, lead.id, phone?.trim() || null).catch(() => {});
    }

    // Fire-and-forget notification email to contractor
    (async () => {
      try {
        const { data: org } = await admin.from("orgs").select("name, owner_user_id").eq("id", pub.org_id).single();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: settings } = await (admin as any).from("org_settings").select("dba_name").eq("org_id", pub.org_id).maybeSingle();
        const businessName = settings?.dba_name || org?.name || "Your Business";

        if (!org?.owner_user_id) return;
        const { data: authUser } = await admin.auth.admin.getUserById(org.owner_user_id);
        const ownerEmail = authUser?.user?.email;
        if (!ownerEmail) return;

        const { client, fromEmail } = await getResendClient();
        await client.emails.send({
          from: fromEmail,
          to: ownerEmail,
          subject: `🔔 New Quote Request from ${name.trim()}`,
          html: homeownerLeadNotificationHtml({
            businessName,
            serviceType: pub.trade || "General",
            homeownerName: name.trim(),
            phone: phone?.trim() || null,
            email: email?.trim() || null,
            homeownerCity: null,
            homeownerState: null,
            description: description?.trim() || "(no description provided)",
            urgency: "flexible",
          }),
        });
      } catch (err) {
        console.error("[quote-request] email error:", err);
      }
    })();

    return NextResponse.json({ ok: true, lead_id: lead?.id });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
