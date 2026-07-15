import { NextRequest, NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, realtorConnectionAcceptedHtml } from "@/lib/email";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json() as { status: "accepted" | "declined" };
  if (!["accepted", "declined"].includes(status)) {
    return NextResponse.json({ error: "status must be accepted or declined" }, { status: 400 });
  }

  const admin = createAdminClient() as any;

  // Update scoped to both id + org_id; select back to confirm a row was actually owned + modified
  const { data: updated, error } = await admin
    .from("realtor_connections")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", orgId)
    .select("id, realtor_profile_id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If no row came back, this org doesn't own that connection — don't send any email
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fire-and-forget notification email to realtor when accepted
  if (status === "accepted") {
    (async () => {
      try {
        const realtorProfileId = updated.realtor_profile_id;
        if (!realtorProfileId) return;

        // Get realtor profile (name + user_id for email lookup)
        const { data: rp } = await admin
          .from("realtor_profiles")
          .select("user_id, display_name")
          .eq("id", realtorProfileId)
          .maybeSingle();
        if (!rp?.user_id) return;

        // Get realtor's auth email
        const { data: authUser } = await admin.auth.admin.getUserById(rp.user_id);
        const realtorEmail = authUser?.user?.email;
        if (!realtorEmail) return;

        // Get contractor org name
        const { data: org } = await admin.from("orgs").select("name").eq("id", orgId).single();
        const { data: settings } = await admin
          .from("org_settings")
          .select("dba_name")
          .eq("org_id", orgId)
          .maybeSingle();
        const contractorName = settings?.dba_name || org?.name || "Your contractor";

        const { client, fromEmail } = await getResendClient();
        await client.emails.send({
          from: fromEmail,
          to: realtorEmail,
          subject: `🤝 ${contractorName} accepted your connection request`,
          html: realtorConnectionAcceptedHtml({
            realtorName: rp.display_name || "there",
            contractorName,
          }),
        });
      } catch (err) {
        console.error("[realtor-connections/accept] email error:", err);
      }
    })();
  }

  return NextResponse.json({ ok: true });
}
