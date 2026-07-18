import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, homeownerLeadNotificationHtml } from "@/lib/email";
import { maybeSendAutoReply } from "@/lib/ai/sms-trigger";

const MAX_REQUEST_BYTES = 20_000;
const MAX_NAME_LENGTH = 100;
const MAX_PHONE_LENGTH = 30;
const MAX_EMAIL_LENGTH = 254;
const MAX_ADDRESS_LENGTH = 300;
const MAX_DESCRIPTION_LENGTH = 3_000;
const MAX_SLUG_LENGTH = 80;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  try {
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json() as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const slug = cleanString(body.slug);
    const name = cleanString(body.name);
    const phone = cleanString(body.phone);
    const email = cleanString(body.email);
    const address = cleanString(body.address);
    const description = cleanString(body.description);

    if (!slug || !name || !phone || !description) {
      return NextResponse.json(
        { error: "Name, phone, and project description are required" },
        { status: 400 }
      );
    }

    if (
      slug.length > MAX_SLUG_LENGTH ||
      name.length > MAX_NAME_LENGTH ||
      phone.length > MAX_PHONE_LENGTH ||
      email.length > MAX_EMAIL_LENGTH ||
      address.length > MAX_ADDRESS_LENGTH ||
      description.length > MAX_DESCRIPTION_LENGTH
    ) {
      return NextResponse.json({ error: "One or more fields are too long" }, { status: 400 });
    }

    if (!/^[a-z0-9-]+$/i.test(slug)) {
      return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
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

    // Suppress accidental retries and basic duplicate spam without requiring an account.
    const duplicateCutoff = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
    const { data: recentLead, error: duplicateCheckError } = await admin
      .from("leads")
      .select("id")
      .eq("org_id", pub.org_id)
      .eq("phone", phone)
      .eq("lead_source", "Website")
      .gte("created_at", duplicateCutoff)
      .limit(1)
      .maybeSingle();

    if (duplicateCheckError) {
      console.error("[public/quote-request] duplicate check error:", duplicateCheckError.message);
    } else if (recentLead) {
      return NextResponse.json({ ok: true });
    }

    // Insert lead
    const { data: lead, error } = await admin.from("leads").insert({
      org_id: pub.org_id,
      name: name,
      phone: phone || null,
      email: email || null,
      address: address || null,
      notes: `[Website Quote Request]\n\n${description}`,
      lead_source: "Website",
      status: "new",
    }).select("id").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fire-and-forget auto-reply SMS (if org has AI assistant + phone configured)
    if (lead?.id) {
      maybeSendAutoReply(pub.org_id, lead.id, phone || null).catch(() => {});
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
        const { error: sendError } = await client.emails.send({
          from: fromEmail,
          to: ownerEmail,
          subject: `🔔 New Quote Request from ${name}`,
          html: homeownerLeadNotificationHtml({
            businessName,
            serviceType: pub.trade || "General",
            homeownerName: name,
            phone: phone || null,
            email: email || null,
            homeownerCity: null,
            homeownerState: null,
            description: description,
            urgency: "flexible",
          }),
        });
        if (sendError) console.error("[public/quote-request] Resend send error:", sendError);
      } catch (err) {
        console.error("[quote-request] email error:", err);
      }
    })();

    return NextResponse.json({ ok: true, lead_id: lead?.id });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
