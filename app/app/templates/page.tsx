import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserOrgRole, isOwnerOrAdmin } from "@/lib/orgRole";
import TemplatesClient from "./TemplatesClient";

export default async function TemplatesPage() {
  const { orgId, role } = await getUserOrgRole();

  if (!orgId) redirect("/auth/login");
  if (!isOwnerOrAdmin(role)) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p className="text-lg font-semibold mb-1">Access Restricted</p>
        <p className="text-sm">Only owners and admins can manage job templates.</p>
      </div>
    );
  }

  const admin = createAdminClient();

  const { data: templates } = await admin
    .from("job_templates")
    .select("id, name, description, required_photo_count, allow_tech_send_invoice_warranty, is_active, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="p-4 pb-28 space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Job Templates</h1>
      <TemplatesClient templates={templates ?? []} />
    </div>
  );
}
