import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getUserOrgRole, isOwnerOrAdmin } from "@/lib/orgRole";

export async function POST(req: Request) {
  const { orgId, role } = await getUserOrgRole();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOwnerOrAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await req.json() as {
    name: string;
    description?: string | null;
    required_photo_count?: number;
    allow_tech_send_invoice_warranty?: boolean;
    warranty_title?: string | null;
    warranty_body?: string | null;
    is_active?: boolean;
    fields?: Array<{
      label: string;
      field_type: string;
      required: boolean;
      sort_order: number;
      options: string[] | null;
    }>;
    invoice_items?: Array<{
      description: string;
      amount: number;
      sort_order: number;
    }>;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Template name is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: template, error } = await admin
    .from("job_templates")
    .insert({
      org_id: orgId,
      name: body.name.trim(),
      description: body.description ?? null,
      required_photo_count: body.required_photo_count ?? 0,
      allow_tech_send_invoice_warranty: body.allow_tech_send_invoice_warranty ?? false,
      warranty_title: body.warranty_title ?? null,
      warranty_body: body.warranty_body ?? null,
      is_active: body.is_active ?? true,
      created_by: user?.id ?? null,
    } as Record<string, unknown>)
    .select("id")
    .single();

  if (error || !template) {
    return NextResponse.json({ error: error?.message ?? "Failed to create template" }, { status: 500 });
  }

  if (body.fields?.length) {
    await admin.from("job_template_fields").insert(
      body.fields.map(f => ({
        org_id: orgId,
        template_id: template.id,
        label: f.label,
        field_type: f.field_type,
        required: f.required,
        sort_order: f.sort_order,
        options: f.options ?? null,
      }))
    );
  }

  if (body.invoice_items?.length) {
    await admin.from("job_template_invoice_items").insert(
      body.invoice_items.map(item => ({
        org_id: orgId,
        template_id: template.id,
        description: item.description,
        amount: item.amount,
        sort_order: item.sort_order,
      }))
    );
  }

  return NextResponse.json({ id: template.id });
}
