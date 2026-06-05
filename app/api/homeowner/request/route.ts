import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/admin";
import { getResendClient } from "@/lib/email";
import { homeownerLeadNotificationHtml } from "@/lib/email";

const MAX_MATCHED_ORGS = 5;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { service_type, description, name, phone, email, city, state, zip, urgency } = body;

    if (!service_type || !description?.trim() || !name?.trim()) {
      return NextResponse.json({ error: "service_type, description, and name are required." }, { status: 400 });
    }
    if (!phone?.trim() && !email?.trim()) {
      return NextResponse.json({ error: "Provide at least a phone number or email." }, { status: 400 });
    }

    const admin = createClient();

    // ── 1. Save the homeowner request ──────────────────────────────────────────
    const { data: request, error: insertErr } = await admin
      .from("homeowner_requests")
      .insert({
        service_type,
        description: description.trim(),
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim()?.toUpperCase() || null,
        zip: zip?.trim() || null,
        urgency: urgency ?? "flexible",
        status: "pending",
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("[homeowner/request] insert error:", insertErr);
      return NextResponse.json({ error: "Failed to save request." }, { status: 500 });
    }

    // ── 2. Find matching orgs ──────────────────────────────────────────────────
    // Join orgs + org_settings to get business name, owner email, location.
    // Match by state if provided; otherwise match all orgs that have location data.
    let settingsQuery = admin
      .from("org_settings")
      .select("org_id, business_name, city, state, lat, lng")
      .not("business_name", "is", null);

    if (state?.trim()) {
      settingsQuery = settingsQuery.ilike("state", state.trim());
    }

    const { data: settingsRows } = await settingsQuery.limit(MAX_MATCHED_ORGS * 3);

    if (!settingsRows || settingsRows.length === 0) {
      // No match by state — try any orgs with settings
      const { data: fallbackRows } = await admin
        .from("org_settings")
        .select("org_id, business_name, city, state, lat, lng")
        .not("business_name", "is", null)
        .limit(MAX_MATCHED_ORGS);

      if (!fallbackRows || fallbackRows.length === 0) {
        await admin.from("homeowner_requests").update({ status: "no_match" }).eq("id", request.id);
        return NextResponse.json({ matched_org_count: 0, request_id: request.id });
      }

      return await routeLeads(admin, request.id, fallbackRows.slice(0, MAX_MATCHED_ORGS), body);
    }

    const matched = settingsRows.slice(0, MAX_MATCHED_ORGS);
    return await routeLeads(admin, request.id, matched, body);

  } catch (err) {
    console.error("[homeowner/request] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

async function routeLeads(
  admin: ReturnType<typeof createClient>,
  requestId: string,
  orgs: { org_id: string; business_name: string | null; city: string | null; state: string | null }[],
  body: Record<string, string>,
) {
  const { service_type, description, name, phone, email, city, state, zip, urgency } = body;

  const leadIds: string[] = [];
  const notifyPromises: Promise<void>[] = [];

  for (const org of orgs) {
    // Create the lead in this org's pipeline
    const { data: lead } = await admin
      .from("leads")
      .insert({
        org_id: org.org_id,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim()?.toUpperCase() || null,
        zip: zip?.trim() || null,
        lead_source: "homeowner_request",
        status: "new",
        notes: `[TradeBase Lead Request]\nService: ${service_type}\nUrgency: ${urgency ?? "flexible"}\n\n${description.trim()}`,
      })
      .select("id")
      .single();

    if (lead?.id) leadIds.push(lead.id);

    // Look up org owner for notification email
    notifyPromises.push(
      (async () => {
        try {
          // Get the owner of this org
          const { data: orgRow } = await admin.from("orgs").select("owner_user_id").eq("id", org.org_id).single();
          if (!orgRow?.owner_user_id) return;
          const { data: authUser } = await admin.auth.admin.getUserById(orgRow.owner_user_id);
          const ownerEmail = authUser?.user?.email;
          if (!ownerEmail) return;

          const { client, fromEmail } = await getResendClient();
          await client.emails.send({
            from: fromEmail,
            to: ownerEmail,
            subject: `🔔 New Lead: ${service_type} in ${city || state || "your area"}`,
            html: homeownerLeadNotificationHtml({
              businessName: org.business_name ?? "Your Business",
              serviceType: service_type,
              homeownerName: name.trim(),
              phone: phone?.trim() || null,
              email: email?.trim() || null,
              homeownerCity: city?.trim() || null,
              homeownerState: state?.trim()?.toUpperCase() || null,
              description: description.trim(),
              urgency: urgency ?? "flexible",
            }),
          });
        } catch (err) {
          console.error("[homeowner/request] notify email error:", err);
        }
      })()
    );
  }

  await Promise.allSettled(notifyPromises);

  // Update the request row with results
  await admin
    .from("homeowner_requests")
    .update({
      status: leadIds.length > 0 ? "matched" : "no_match",
      matched_org_count: leadIds.length,
      lead_ids: leadIds,
    })
    .eq("id", requestId);

  return NextResponse.json({
    matched_org_count: leadIds.length,
    request_id: requestId,
  });
}
