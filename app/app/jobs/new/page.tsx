import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { getUserOrgRole, isOwnerOrAdmin } from "@/lib/orgRole";
import { getOrgMembers, memberDisplayName } from "@/lib/teamUtils";
import NewJobClient from "./NewJobClient";

type PageProps = { searchParams: Promise<Record<string, string>> };

export default async function NewJobPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const preAssignTo = params.assignTo ?? null;

  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { role } = await getUserOrgRole();
  const canAssignTemplate = isOwnerOrAdmin(role);
  const canAssign = isOwnerOrAdmin(role);

  const [customersRes, templatesRes, membersData] = await Promise.all([
    admin
      .from("customers")
      .select("id,first_name,last_name,company_name")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false }),
    canAssignTemplate
      ? (admin as any)
          .from("job_templates")
          .select("id,name")
          .eq("org_id", orgId!)
          .eq("is_active", true)
          .order("name", { ascending: true })
      : Promise.resolve({ data: [] }),
    canAssign ? getOrgMembers(orgId!) : Promise.resolve([]),
  ]);

  const customerOptions = (customersRes.data ?? []).map((c) => ({
    id: c.id,
    name:
      [c.first_name, c.last_name].filter(Boolean).join(" ") ||
      c.company_name ||
      "Unnamed",
  }));

  const templateOptions = ((templatesRes.data ?? []) as { id: string; name: string }[]).map((t) => ({
    id: t.id,
    name: t.name,
  }));

  const memberOptions = (membersData as Awaited<ReturnType<typeof getOrgMembers>>).map(m => ({
    userId: m.userId,
    name: memberDisplayName(m),
  }));

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/app/jobs" className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-slate-800">New Job</h1>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <NewJobClient
          customers={customerOptions}
          templates={templateOptions}
          canAssignTemplate={canAssignTemplate}
          members={memberOptions}
          preAssignTo={preAssignTo}
        />
      </div>
    </div>
  );
}
