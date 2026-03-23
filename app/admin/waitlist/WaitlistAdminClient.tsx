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

export default function WaitlistAdminClient({ entries }: { entries: WaitlistEntry[] }) {
  const [q, setQ] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = entries.filter((e) => {
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

  return (
    <div className="space-y-4">
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
          {q ? `No results for "${q}"` : "No waitlist entries yet."}
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
                <th className="px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">State</th>
                <th className="px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Source</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Signed Up</th>
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
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{e.state ?? "—"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {e.source?.startsWith("ref:") ? (
                        <span className="text-xs bg-green-50 text-green-700 rounded-full px-2 py-0.5 font-medium">
                          Referred · {e.source.replace("ref:", "")}
                        </span>
                      ) : (
                        <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                          {e.source ?? "website"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(e.created_at)}</td>
                  </tr>
                  {expandedId === e.id && (
                    <tr key={`${e.id}-expand`} className="bg-blue-50">
                      <td colSpan={7} className="px-4 py-3 text-sm">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                          <div><span className="text-xs font-semibold text-gray-400 uppercase">Company</span><p className="text-slate-700">{e.company_name || "—"}</p></div>
                          <div><span className="text-xs font-semibold text-gray-400 uppercase">State</span><p className="text-slate-700">{e.state || "—"}</p></div>
                          <div><span className="text-xs font-semibold text-gray-400 uppercase">Source</span><p className="text-slate-700">{e.source?.startsWith("ref:") ? `Referred by code: ${e.source.replace("ref:", "")}` : (e.source || "website")}</p></div>
                          <div><span className="text-xs font-semibold text-gray-400 uppercase">Trade</span><p className="text-slate-700">{e.trade_type || "—"}</p></div>
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
