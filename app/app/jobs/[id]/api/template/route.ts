import { NextResponse } from "next/server";
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
    return NextResponse.json({ error: "Only Owner/Admin can assign templates" }, { status: 403 });
  }

  const admin = createAdminClient();
  const body = await req.json() as { template_id: string | null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("jobs")
    .update({ template_id: body.template_id ?? null })
    .eq("id", jobId)
    .eq("org_id", orgId!);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
