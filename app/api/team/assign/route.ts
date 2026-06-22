import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserOrgRole, isOwnerOrAdmin } from "@/lib/orgRole";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/team/assign
 * Body: { entityType: "job"|"quote"|"invoice", entityId: string, assignedTo: string|null }
 * Admin/owner only.
 */
export async function PATCH(req: NextRequest) {
  const { role, orgId } = await getUserOrgRole();
  if (!isOwnerOrAdmin(role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json() as { entityType?: string; entityId?: string; assignedTo?: string | null };
  const { entityType, entityId, assignedTo } = body;

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId required" }, { status: 400 });
  }

  const table = entityType === "job" ? "jobs"
    : entityType === "quote" ? "quotes"
    : entityType === "invoice" ? "invoices"
    : null;

  if (!table) {
    return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from(table)
    .update({ assigned_to: assignedTo ?? null })
    .eq("id", entityId)
    .eq("org_id", orgId!);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
