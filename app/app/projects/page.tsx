import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import ProjectsClient from "./ProjectsClient";
import { ChevronLeft, AlertTriangle } from "lucide-react";

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
    <div className="p-4 sm:p-6 bg-[#FAFAFA] min-h-screen font-sans selection:bg-pink-400 selection:text-black pb-24">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/app/more" className="bg-white border-[3px] border-black p-2 rounded-xl shadow-[3px_3px_0_0_#000] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all">
          <ChevronLeft className="h-6 w-6 text-black" strokeWidth={3} />
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black text-black uppercase tracking-tighter">Mission Log</h1>
      </div>

      {projects === null ? (
        <div className="bg-yellow-300 border-[4px] border-black rounded-2xl px-6 py-6 text-black shadow-[6px_6px_0_0_#000]">
          <p className="font-black uppercase tracking-widest text-lg mb-2 flex items-center gap-2">
            <span className="text-2xl"><AlertTriangle className="h-6 w-6 inline" /></span> SYSTEM ERROR
          </p>
          <p className="text-sm font-bold">Run <code className="bg-black text-white px-2 py-1 rounded-md mx-1 font-mono">supabase/migration_projects.sql</code> to unlock this zone.</p>
        </div>
      ) : (
        <ProjectsClient initialProjects={projects} />
      )}
    </div>
  );
}
