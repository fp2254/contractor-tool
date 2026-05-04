import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserOrgRole, isOwnerOrAdmin } from "@/lib/orgRole";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const { orgId, role } = await getUserOrgRole();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOwnerOrAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as Record<string, unknown>;
  const admin = createAdminClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowed = [
    "name", "description", "required_photo_count",
    "allow_tech_send_invoice_warranty", "warranty_title",
    "warranty_body", "is_active",
  ];
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { error } = await admin
    .from("job_templates")
    .update(updates)
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if ("fields" in body && Array.isArray(body.fields)) {
    await admin.from("job_template_fields").delete().eq("template_id", id);
    const fields = body.fields as Array<{
      label: string; field_type: string; required: boolean;
      sort_order: number; options: string[] | null;
    }>;
    if (fields.length) {
      await admin.from("job_template_fields").insert(
        fields.map(f => ({
          org_id: orgId,
          template_id: id,
          label: f.label,
          field_type: f.field_type,
          required: f.required,
          sort_order: f.sort_order,
          options: f.options ?? null,
        }))
      );
    }
  }

  if ("invoice_items" in body && Array.isArray(body.invoice_items)) {
    await admin.from("job_template_invoice_items").delete().eq("template_id", id);
    const items = body.invoice_items as Array<{
      description: string; amount: number; sort_order: number;
    }>;
    if (items.length) {
      await admin.from("job_template_invoice_items").insert(
        items.map(item => ({
          org_id: orgId,
          template_id: id,
          description: item.description,
          amount: item.amount,
          sort_order: item.sort_order,
        }))
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const { orgId, role } = await getUserOrgRole();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOwnerOrAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  // TODO Phase 2: block deletion if template is assigned to any job
  // const { count } = await admin.from("jobs").select("id", { count: "exact" }).eq("template_id", id).eq("org_id", orgId);
  // if (count && count > 0) return NextResponse.json({ error: "Template is in use and cannot be deleted." }, { status: 409 });

  await admin.from("job_template_fields").delete().eq("template_id", id);
  await admin.from("job_template_invoice_items").delete().eq("template_id", id);

  const { error } = await admin
    .from("job_templates")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
