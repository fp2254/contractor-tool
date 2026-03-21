import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const body = await req.json() as {
    archived?: boolean;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    phone?: string;
    email?: string;
    address_line1?: string;
    city?: string;
    state?: string;
    zip?: string;
    notes?: string;
  };

  const allowed = [
    "archived", "first_name", "last_name", "company_name",
    "phone", "email", "address_line1", "city", "state", "zip", "notes",
  ];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = (body as Record<string, unknown>)[key];
  }

  const { data, error } = await admin
    .from("customers")
    .update(patch)
    .eq("id", id)
    .eq("org_id", orgId!)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const { error } = await admin
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId!);

  if (error) {
    const msg = error.message.includes("foreign key")
      ? "This client has linked quotes, jobs, or invoices and cannot be deleted."
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
