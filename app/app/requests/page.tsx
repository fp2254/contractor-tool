import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  Website: { label: "Profile", color: "bg-blue-100 text-blue-700" },
  homeowner_request: { label: "Find Contractors", color: "bg-purple-100 text-purple-700" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function RequestsPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const { data: leads } = await admin
    .from("leads")
    .select("id, name, phone, email, status, lead_source, notes, created_at, city, state")
    .eq("org_id", orgId!)
    .in("lead_source", ["Website", "homeowner_request"])
    .order("created_at", { ascending: false });

  const requests = leads ?? [];
  const newCount = requests.filter((r) => r.status === "new").length;

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Quote Requests</h1>
          <p className="text-xs text-gray-500 mt-0.5">Homeowners asking for your services</p>
        </div>
        {newCount > 0 && (
          <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {newCount} new
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-3xl mb-3">📬</p>
          <p className="font-semibold text-slate-700 mb-1">No requests yet</p>
          <p className="text-sm text-gray-400 mb-4">
            Publish your public profile so homeowners can find you.
          </p>
          <Link
            href="/app/profile/public-profile"
            className="inline-block text-sm font-bold text-white px-5 py-2.5 rounded-xl"
            style={{ backgroundColor: "#1B3A6B" }}
          >
            Set Up Profile
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const src = SOURCE_LABELS[req.lead_source ?? ""] ?? { label: req.lead_source ?? "Direct", color: "bg-gray-100 text-gray-600" };
            const descLine = req.notes
              ? req.notes.replace(/^\[.*?\]\n\n?/, "").replace(/^Service:.*\n.*\n\n?/, "").slice(0, 120)
              : null;
            const location = [req.city, req.state].filter(Boolean).join(", ");

            return (
              <Link
                key={req.id}
                href={`/app/leads/${req.id}`}
                className="block bg-white rounded-2xl shadow-sm p-4 active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{req.name}</p>
                    {req.status === "new" && (
                      <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${src.color}`}>
                    {src.label}
                  </span>
                </div>

                {descLine && (
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">{descLine}</p>
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  {req.phone && (
                    <span className="text-xs text-gray-400">📞 {req.phone}</span>
                  )}
                  {location && (
                    <span className="text-xs text-gray-400">📍 {location}</span>
                  )}
                  <span className="text-xs text-gray-300 ml-auto">{timeAgo(req.created_at)}</span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    req.status === "new" ? "bg-orange-100 text-orange-700" :
                    req.status === "contacted" ? "bg-blue-100 text-blue-700" :
                    req.status === "won" ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {req.status}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">View details →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
