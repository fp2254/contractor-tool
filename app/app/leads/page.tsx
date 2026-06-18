import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import LeadsImportModal from "./LeadsImportModal";

const STATUS_TABS = [
  { label: "All", key: "all" },
  { label: "New", key: "new" },
  { label: "Contacted", key: "contacted" },
  { label: "Quoted", key: "quoted" },
  { label: "Scheduled", key: "scheduled" },
  { label: "Won", key: "won" },
  { label: "Lost", key: "lost" },
];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-orange-100 text-orange-700",
  contacted: "bg-blue-100 text-blue-700",
  quoted: "bg-purple-100 text-purple-700",
  scheduled: "bg-green-100 text-green-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const activeStatus = sp?.status ?? "all";
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  let query = admin.from("leads").select("*").eq("org_id", orgId!).order("created_at", { ascending: false });
  if (activeStatus !== "all") query = query.eq("status", activeStatus);
  const { data: leads } = await query;

  const { data: allLeads } = await admin.from("leads").select("id,status").eq("org_id", orgId!);
  const counts: Record<string, number> = { all: allLeads?.length ?? 0 };
  allLeads?.forEach((l) => { counts[l.status] = (counts[l.status] ?? 0) + 1; });

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Leads</h1>
        <Link href="/app/search" className="text-gray-500">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {STATUS_TABS.map((tab) => {
          const count = counts[tab.key] ?? 0;
          const isActive = tab.key === activeStatus;
          return (
            <Link key={tab.key}
              href={tab.key === "all" ? "/app/leads" : `/app/leads?status=${tab.key}`}
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${isActive ? "text-white" : "bg-white text-gray-600"}`}
              style={isActive ? { backgroundColor: "#1B3A6B" } : {}}>
              {tab.label}{count > 0 && tab.key !== "all" ? ` ${count}` : ""}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/app/leads/new"
          className="flex items-center justify-center gap-2 rounded-xl py-3 text-white font-semibold"
          style={{ backgroundColor: "#1B3A6B" }}>
          <span className="text-lg">+</span> Add Lead
        </Link>
        <LeadsImportModal />
      </div>

      <div className="space-y-3">
        {!leads?.length && (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
            {activeStatus === "all" ? "No leads yet. Tap Add Lead to get started." : `No ${activeStatus} leads.`}
          </div>
        )}
        {leads?.map((lead) => (
          <Link key={lead.id} href={`/app/leads/${lead.id}`} className="block bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: "#1B3A6B" }}>
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{lead.name}</p>
                  {lead.address && <p className="text-xs text-gray-500">{[lead.address, lead.city, lead.state].filter(Boolean).join(", ")}</p>}
                  {lead.phone && <p className="text-xs text-gray-500">📞 {lead.phone}</p>}
                </div>
              </div>
              <span className="text-xs text-gray-400 shrink-0">{timeAgo(lead.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 ml-13">
              {lead.job_type && <span className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">{lead.job_type}</span>}
              <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[lead.status] ?? "bg-gray-100 text-gray-600"}`}>
                {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
