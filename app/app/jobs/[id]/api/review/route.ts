import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { getUserOrgRole, isOwnerOrAdmin } from "@/lib/orgRole";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const orgId = await ensureUserOrg();
  const { role } = await getUserOrgRole();

  if (!isOwnerOrAdmin(role)) {
    return NextResponse.json({ error: "Only Owner/Admin can review jobs" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const body = await req.json() as { action: "approve" | "send_back"; reason?: string };

  if (!["approve", "send_back"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (body.action === "approve") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from("jobs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("org_id", orgId!);

    // Also update the job_report status snapshot
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from("job_reports")
      .update({ report_data: { status: "completed" }, updated_at: new Date().toISOString() })
      .eq("job_id", jobId)
      .eq("org_id", orgId!);

  } else {
    // send_back → in_progress
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from("jobs")
      .update({ status: "in_progress" })
      .eq("id", jobId)
      .eq("org_id", orgId!);

    // Add a note with the reason
    const reason = body.reason?.trim() || "Sent back for revision";
    await admin.from("notes").insert({
      org_id: orgId!,
      entity_type: "job",
      entity_id: jobId,
      body: `⟲ Sent back for revision: ${reason}`,
      created_by: user?.id ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
