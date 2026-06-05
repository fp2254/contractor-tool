import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH — approve or reject a review (contractor only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await ensureUserOrg();
  const { id } = await params;
  const body = await req.json() as { action: "approve" | "reject" };

  if (!["approve", "reject"].includes(body.action)) {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify this review belongs to the org
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: review } = await (admin as any)
    .from("profile_reviews")
    .select("org_id")
    .eq("id", id)
    .maybeSingle();

  if (!review || review.org_id !== orgId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("profile_reviews")
    .update({ approved: body.action === "approve" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, approved: body.action === "approve" });
}

// DELETE — remove a review (contractor only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await ensureUserOrg();
  const { id } = await params;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: review } = await (admin as any)
    .from("profile_reviews")
    .select("org_id")
    .eq("id", id)
    .maybeSingle();

  if (!review || review.org_id !== orgId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("profile_reviews").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
