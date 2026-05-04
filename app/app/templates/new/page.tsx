import { redirect } from "next/navigation";
import { getUserOrgRole, isOwnerOrAdmin } from "@/lib/orgRole";
import TemplateEditorClient from "../[id]/TemplateEditorClient";

export default async function NewTemplatePage() {
  const { orgId, role } = await getUserOrgRole();
  if (!orgId) redirect("/auth/login");
  if (!isOwnerOrAdmin(role)) redirect("/app/templates");

  return (
    <div className="p-4 pb-28 space-y-4">
      <h1 className="text-xl font-bold text-slate-800">New Template</h1>
      <TemplateEditorClient
        template={null}
        fields={[]}
        invoiceItems={[]}
      />
    </div>
  );
}
