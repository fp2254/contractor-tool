import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import NewJobClient from "./NewJobClient";

export default async function NewJobPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const { data: customers } = await admin
    .from("customers")
    .select("id,first_name,last_name,company_name")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: false });

  const customerOptions = (customers ?? []).map((c) => ({
    id: c.id,
    name:
      [c.first_name, c.last_name].filter(Boolean).join(" ") ||
      c.company_name ||
      "Unnamed",
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
        <NewJobClient customers={customerOptions} />
      </div>
    </div>
  );
}
