import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import ProjectsClient from "./ProjectsClient";

export default async function ProjectsPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  let projects: any[] = [];
  try {
    const { data } = await (admin as any)
      .from("projects")
      .select("*")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false });
    projects = data ?? [];
  } catch {
    // Table may not exist yet — show empty state with migration note
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/app/more" className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-slate-800">Completed Projects</h1>
      </div>

      {projects === null ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">Database setup needed</p>
          <p className="text-xs">Run <code className="bg-amber-100 px-1 rounded">supabase/migration_projects.sql</code> in your Supabase SQL editor to enable this feature.</p>
        </div>
      ) : (
        <ProjectsClient initialProjects={projects} />
      )}
    </div>
  );
}
