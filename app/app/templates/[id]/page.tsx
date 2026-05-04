import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserOrgRole, isOwnerOrAdmin } from "@/lib/orgRole";
import TemplateEditorClient from "./TemplateEditorClient";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId, role } = await getUserOrgRole();
  if (!orgId) redirect("/auth/login");
  if (!isOwnerOrAdmin(role)) redirect("/app/templates");

  const admin = createAdminClient();

  const [{ data: template }, { data: fields }, { data: invoiceItems }] = await Promise.all([
    admin
      .from("job_templates")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .single(),
    admin
      .from("job_template_fields")
      .select("*")
      .eq("template_id", id)
      .order("sort_order", { ascending: true }),
    admin
      .from("job_template_invoice_items")
      .select("*")
      .eq("template_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  if (!template) notFound();

  return (
    <div className="p-4 pb-28 space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Edit Template</h1>
      <TemplateEditorClient
        template={template as any}
        fields={(fields ?? []) as any}
        invoiceItems={(invoiceItems ?? []) as any}
      />
    </div>
  );
}
