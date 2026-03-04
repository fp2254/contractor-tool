import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import Link from "next/link";

const STATUS_TABS = ["All", "New", "Contacted", "Quoted", "Scheduled", "Lost"];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-orange-100 text-orange-700",
  contacted: "bg-amber-100 text-amber-700",
  quoted: "bg-blue-100 text-blue-700",
  scheduled: "bg-green-100 text-green-700",
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

export default async function LeadsPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { data: leads } = await admin
    .from("leads")
    .select("*")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: false });

  const counts: Record<string, number> = { all: leads?.length ?? 0 };
  leads?.forEach((l) => { counts[l.status] = (counts[l.status] ?? 0) + 1; });

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Leads</h1>
        <div className="flex gap-2">
          <button className="text-gray-500"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></button>
          <button className="text-gray-500"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M7 12h10M11 18h2"/></svg></button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {STATUS_TABS.map((tab) => {
          const key = tab.toLowerCase();
          const count = key === "all" ? counts.all : (counts[key] ?? 0);
          const isActive = tab === "All";
          return (
            <button key={tab} className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${isActive ? "text-white" : "bg-white text-gray-600"}`}
              style={isActive ? { backgroundColor: "#1B3A6B" } : {}}>
              {tab}{count > 0 && key !== "all" ? ` ${count}` : ""}
            </button>
          );
        })}
      </div>

      <Link href="/app/leads/new"
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white font-semibold"
        style={{ backgroundColor: "#1B3A6B" }}>
        <span className="text-lg">+</span> Add Lead
      </Link>

      <div className="space-y-3">
        {!leads?.length && (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">No leads yet.</div>
        )}
        {leads?.map((lead) => (
          <div key={lead.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: "#1B3A6B" }}>
                  {lead.name ? lead.name.charAt(0).toUpperCase() : "?"}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{lead.name || "Unnamed"}</p>
                  {lead.address && <p className="text-xs text-gray-500">{[lead.address, lead.city, lead.state].filter(Boolean).join(", ")}</p>}
                  {lead.phone && <p className="text-xs text-gray-500 flex items-center gap-1">📞 {lead.phone}</p>}
                </div>
              </div>
              <span className="text-xs text-gray-400 shrink-0">{timeAgo(lead.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {lead.lead_source && (
                <span className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">{lead.lead_source}</span>
              )}
              <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[lead.status] ?? "bg-gray-100 text-gray-600"}`}>
                {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
