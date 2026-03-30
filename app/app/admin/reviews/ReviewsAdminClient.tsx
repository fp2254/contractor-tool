"use client";

import { useState } from "react";

type ReviewRow = {
  id: string;
  org_id: string;
  org_name: string;
  reviewer_name: string;
  reviewer_email: string;
  stars: number;
  comment: string;
  job_type: string | null;
  location_text: string | null;
  approved: boolean;
  created_at: string;
  slug: string | null;
};

const STAR_COLORS = ["", "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

function Stars({ count }: { count: number }) {
  return (
    <span>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < count ? "#f5a623" : "#e2e8f0", fontSize: 13 }}>★</span>
      ))}
    </span>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ReviewsAdminClient({ initialRows }: { initialRows: ReviewRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [filterApproved, setFilterApproved] = useState("all");
  const [q, setQ] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = rows.filter((r) => {
    if (filterApproved === "approved" && !r.approved) return false;
    if (filterApproved === "hidden" && r.approved) return false;
    if (q.trim()) {
      const s = q.toLowerCase();
      if (!r.reviewer_name.toLowerCase().includes(s) && !r.org_name.toLowerCase().includes(s) && !r.comment.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  async function toggleApproval(id: string, current: boolean) {
    setToggling(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: !current }),
      });
      if (res.ok) {
        setRows((prev) => prev.map((r) => r.id === id ? { ...r, approved: !current } : r));
      }
    } finally {
      setToggling(null);
    }
  }

  async function deleteReview(id: string) {
    if (!confirm("Delete this review permanently?")) return;
    setToggling(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (res.ok) setRows((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <input
          placeholder="Search reviews…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 min-w-[180px] rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none"
        />
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
          {[["all", "All"], ["approved", "Visible"], ["hidden", "Hidden"]].map(([v, label]) => (
            <button key={v} onClick={() => setFilterApproved(v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterApproved === v ? "bg-[#1B3A6B] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} of {rows.length} reviews</p>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 p-6 text-center">No reviews match your filters.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((r) => (
              <div key={r.id}>
                <div
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <Stars count={r.stars} />
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.approved ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {r.approved ? "Visible" : "Hidden"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">{r.reviewer_name}</p>
                    <p className="text-xs text-gray-400 truncate">{r.org_name}{r.slug ? ` · /pro/${r.slug}` : ""} · {fmtDate(r.created_at)}</p>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{r.comment}</p>
                  </div>
                  <span className="text-xs text-gray-300 mt-1">{expanded === r.id ? "▲" : "▼"}</span>
                </div>

                {expanded === r.id && (
                  <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-3">
                    <div className="pt-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Review</p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{r.comment}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div><span className="font-semibold">Email:</span><br />{r.reviewer_email}</div>
                      <div><span className="font-semibold">Job type:</span><br />{r.job_type ?? "—"}</div>
                      <div><span className="font-semibold">Location:</span><br />{r.location_text ?? "—"}</div>
                      <div><span className="font-semibold">Org ID:</span><br /><span className="font-mono text-[10px] break-all">{r.org_id}</span></div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => toggleApproval(r.id, r.approved)}
                        disabled={toggling === r.id}
                        className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-colors ${r.approved ? "border-gray-200 text-gray-600 hover:bg-gray-100" : "border-green-200 text-green-700 bg-green-50 hover:bg-green-100"}`}>
                        {toggling === r.id ? "…" : r.approved ? "Hide Review" : "Make Visible"}
                      </button>
                      <button
                        onClick={() => deleteReview(r.id)}
                        disabled={toggling === r.id}
                        className="flex-1 text-xs font-semibold py-2 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
