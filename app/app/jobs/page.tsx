import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

const STATUS_TABS = ["All", "Today", "Scheduled", "In Progress", "Completed"];

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function JobsPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const { data: jobs } = await admin
    .from("jobs")
    .select("id,job_title,status,scheduled_date,address,city,state,customer_id")
    .eq("org_id", orgId!)
    .order("scheduled_date", { ascending: true });

  const { data: customers } = await admin
    .from("customers")
    .select("id,first_name,last_name")
    .eq("org_id", orgId!);

  const customerMap = Object.fromEntries((customers ?? []).map((c) => [c.id, `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()]));

  const today = new Date().toISOString().slice(0, 10);
  const counts = {
    all: jobs?.length ?? 0,
    today: jobs?.filter(j => j.scheduled_date === today).length ?? 0,
    scheduled: jobs?.filter(j => j.status === "scheduled").length ?? 0,
    in_progress: jobs?.filter(j => j.status === "in_progress").length ?? 0,
    completed: jobs?.filter(j => j.status === "completed").length ?? 0,
  };

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold text-slate-800">Jobs</h1>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {STATUS_TABS.map((tab) => {
          const key = tab.toLowerCase().replace(" ", "_");
          const count = (counts as any)[key] ?? 0;
          const isActive = tab === "All";
          return (
            <button key={tab} className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${isActive ? "text-white" : "bg-white text-gray-600"}`}
              style={isActive ? { backgroundColor: "#1B3A6B" } : {}}>
              {tab}{count > 0 ? ` ${count}` : ""}
            </button>
          );
        })}
      </div>

      <Link href="/app/jobs/new"
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white font-semibold"
        style={{ backgroundColor: "#1B3A6B" }}>
        <span className="text-lg">+</span> Add Job
      </Link>

      <div className="space-y-3">
        {!jobs?.length && (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">No jobs yet.</div>
        )}
        {jobs?.map((job) => (
          <Link key={job.id} href={`/app/jobs/${job.id}`} className="block bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="font-bold text-slate-800">{customerMap[job.customer_id] || "Unknown"}</p>
                <p className="text-sm text-gray-600">{job.job_title}</p>
                {job.address && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">📍 {[job.address, job.city, job.state].filter(Boolean).join(", ")}</p>}
              </div>
              <span className={`text-xs rounded-full px-2 py-1 font-medium shrink-0 ${STATUS_BADGE[job.status] ?? "bg-gray-100 text-gray-600"}`}>
                {job.status === "in_progress" ? "In Progress" : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </span>
            </div>
            {job.scheduled_date && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500 flex items-center gap-1">📅 {formatDate(job.scheduled_date)}</span>
                <div className="flex gap-2 text-gray-400">
                  <span>📞</span><span>📋</span>
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
