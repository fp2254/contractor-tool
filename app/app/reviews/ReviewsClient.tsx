"use client";

import { useState } from "react";

type Review = {
  id: string;
  reviewer_name: string;
  rating: number;
  text: string;
  job_type: string | null;
  location: string | null;
  verified: boolean;
  approved: boolean;
  created_at: string;
};

function Stars({ n }: { n: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {"★".repeat(n)}{"☆".repeat(5 - n)}
    </span>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ReviewsClient({ initialReviews }: { initialReviews: Review[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = reviews.filter((r) => {
    if (filter === "pending") return !r.approved;
    if (filter === "approved") return r.approved;
    return true;
  });

  const pendingCount = reviews.filter((r) => !r.approved).length;

  async function handleAction(id: string, action: "approve" | "reject" | "delete") {
    setLoading(id + action);
    try {
      if (action === "delete") {
        const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
        if (res.ok) setReviews((prev) => prev.filter((r) => r.id !== id));
      } else {
        const res = await fetch(`/api/reviews/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (res.ok) {
          setReviews((prev) =>
            prev.map((r) => r.id === id ? { ...r, approved: action === "approve" } : r)
          );
        }
      }
    } catch { /* silent */ }
    finally { setLoading(null); }
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          { key: "pending", label: "Pending", badge: pendingCount },
          { key: "approved", label: "Approved" },
          { key: "all", label: "All" },
        ] as const).map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              filter === key
                ? "bg-slate-800 text-white"
                : "bg-white text-gray-500 border border-gray-200"
            }`}
          >
            {label}
            {badge !== undefined && badge > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                filter === key ? "bg-white/20" : "bg-orange-100 text-orange-600"
              }`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-2xl mb-2">{filter === "pending" ? "✅" : "⭐"}</p>
          <p className="text-sm text-gray-400">
            {filter === "pending" ? "No pending reviews" : "No reviews yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{r.reviewer_name}</p>
                  <Stars n={r.rating} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.approved ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Live</span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>
                  )}
                  <span className="text-[10px] text-gray-400">{timeAgo(r.created_at)}</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-2 leading-relaxed">{r.text}</p>

              {(r.job_type || r.location) && (
                <div className="flex gap-3 mb-3">
                  {r.job_type && <span className="text-xs text-gray-400">🔨 {r.job_type}</span>}
                  {r.location && <span className="text-xs text-gray-400">📍 {r.location}</span>}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {!r.approved ? (
                  <button
                    onClick={() => handleAction(r.id, "approve")}
                    disabled={loading === r.id + "approve"}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-green-500 disabled:opacity-50"
                  >
                    {loading === r.id + "approve" ? "…" : "✓ Approve"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction(r.id, "reject")}
                    disabled={loading === r.id + "reject"}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 disabled:opacity-50"
                  >
                    {loading === r.id + "reject" ? "…" : "Unpublish"}
                  </button>
                )}
                <button
                  onClick={() => handleAction(r.id, "delete")}
                  disabled={loading === r.id + "delete"}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-red-500 bg-red-50 disabled:opacity-50"
                >
                  {loading === r.id + "delete" ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
