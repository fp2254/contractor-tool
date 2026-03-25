"use client";

import { useState } from "react";

export type WaitlistEntry = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  trade_type: string | null;
  company_name: string | null;
  state: string | null;
  pain_point: string | null;
  source: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function downloadCsv(entries: WaitlistEntry[]) {
  const headers = ["First Name","Last Name","Email","Phone","Trade","Company","State","Source","Pain Point","Signed Up"];
  const rows = entries.map((e) => [
    e.first_name, e.last_name, e.email,
    e.phone ?? "",
    e.trade_type ?? "",
    e.company_name ?? "",
    e.state ?? "",
    e.source ?? "",
    (e.pain_point ?? "").replace(/\n/g, " "),
    formatDate(e.created_at),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tradebase-waitlist-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function isInvited(source: string | null) {
  return source?.endsWith("-invited") || source === "invited";
}

function SourceBadge({ source }: { source: string | null }) {
  if (isInvited(source)) {
    return (
      <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">
        ✓ Invited
      </span>
    );
  }
  if (source?.startsWith("ref:")) {
    return (
      <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 font-medium">
        Referred · {source.replace("ref:", "")}
      </span>
    );
  }
  return (
    <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-medium">
      {source ?? "website"}
    </span>
  );
}

function InviteButton({ entry, onInvited }: { entry: WaitlistEntry; onInvited: (id: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleInvite() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/app/admin/waitlist/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entry.id,
          email: entry.email,
          first_name: entry.first_name,
          last_name: entry.last_name,
          biz_name: entry.company_name ?? "",
          trade: entry.trade_type ?? "",
          phone: entry.phone ?? "",
        }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      onInvited(entry.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={(e) => { e.stopPropagation(); handleInvite(); }}
        disabled={loading}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-[#1B3A6B] disabled:opacity-50 active:opacity-80">
        {loading ? "Sending…" : "Send Invite"}
      </button>
      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  );
}

export default function WaitlistAdminClient({ entries: initial }: { entries: WaitlistEntry[] }) {
  const [entries, setEntries] = useState(initial);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "pending" | "invited">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleInvited(id: string) {
    setEntries(prev =>
      prev.map(e => e.id === id ? { ...e, source: "invited" } : e)
    );
  }

  const tabFiltered = tab === "pending"
    ? entries.filter(e => !isInvited(e.source))
    : tab === "invited"
    ? entries.filter(e => isInvited(e.source))
    : entries;

  const filtered = tabFiltered.filter((e) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      e.first_name.toLowerCase().includes(s) ||
      e.last_name.toLowerCase().includes(s) ||
      e.email.toLowerCase().includes(s) ||
      (e.trade_type ?? "").toLowerCase().includes(s) ||
      (e.state ?? "").toLowerCase().includes(s) ||
      (e.source ?? "").toLowerCase().includes(s)
    );
  });

  const pendingCount = entries.filter(e => !isInvited(e.source)).length;
  const invitedCount = entries.filter(e => isInvited(e.source)).length;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-2">
        {([
          { key: "all", label: `All (${entries.length})` },
          { key: "pending", label: `Pending${pendingCount ? ` (${pendingCount})` : ""}` },
          { key: "invited", label: `Invited${invitedCount ? ` (${invitedCount})` : ""}` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              tab === key
                ? "text-white"
                : "bg-white text-slate-600 border border-gray-200"
            }`}
            style={tab === key ? { backgroundColor: "#1B3A6B" } : {}}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <input
          className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          placeholder="Search by name, email, trade, state, or source…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          onClick={() => downloadCsv(filtered)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-white font-semibold text-sm"
          style={{ backgroundColor: "#1B3A6B" }}>
          ⬇ Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm">
          {q ? `No results for "${q}"` : tab === "invited" ? "No one invited yet." : tab === "pending" ? "No pending entries." : "No waitlist entries yet."}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600">Name</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Email</th>
                <th className="px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Phone</th>
                <th className="px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Trade</th>
                <th className="px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 font-semibold text-slate-600"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <>
                  <tr
                    key={e.id}
                    onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {e.first_name} {e.last_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <a href={`mailto:${e.email}`} onClick={(ev) => ev.stopPropagation()}
                        className="text-[#1B3A6B] hover:underline">
                        {e.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                      {e.phone ? <a href={`tel:${e.phone}`} onClick={(ev) => ev.stopPropagation()}>{e.phone}</a> : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{e.trade_type ?? "—"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <SourceBadge source={e.source} />
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(e.created_at)}</td>
                    <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                      {isInvited(e.source) ? (
                        <span className="text-xs text-green-600 font-semibold">✓ Invited</span>
                      ) : (
                        <InviteButton entry={e} onInvited={handleInvited} />
                      )}
                    </td>
                  </tr>
                  {expandedId === e.id && (
                    <tr key={`${e.id}-expand`} className="bg-blue-50">
                      <td colSpan={7} className="px-4 py-3 text-sm">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                          <div><span className="text-xs font-semibold text-gray-400 uppercase">Company</span><p className="text-slate-700">{e.company_name || "—"}</p></div>
                          <div><span className="text-xs font-semibold text-gray-400 uppercase">State</span><p className="text-slate-700">{e.state || "—"}</p></div>
                          <div><span className="text-xs font-semibold text-gray-400 uppercase">Trade</span><p className="text-slate-700">{e.trade_type || "—"}</p></div>
                          <div><span className="text-xs font-semibold text-gray-400 uppercase">Status</span><p className="text-slate-700"><SourceBadge source={e.source} /></p></div>
                        </div>
                        {e.pain_point && (
                          <div><span className="text-xs font-semibold text-gray-400 uppercase">Pain Point</span><p className="text-slate-600 mt-0.5 italic">&ldquo;{e.pain_point}&rdquo;</p></div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {filtered.length} of {entries.length} entries · Click any row to expand
          </div>
        </div>
      )}
    </div>
  );
}
