"use client";

import { useState } from "react";
import Link from "next/link";
import { SwipeActionRow } from "@/components/SwipeActionRow";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

export type QuoteRow = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  customer_id: string;
};

export default function QuotesListClient({
  initialQuotes,
  customerMap,
  openedIds = [],
}: {
  initialQuotes: QuoteRow[];
  customerMap: Record<string, string>;
  openedIds?: string[];
}) {
  const [quotes, setQuotes] = useState(initialQuotes.filter(q => q.status !== "archived"));
  const openedSet = new Set(openedIds);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);

  async function handleArchive(id: string) {
    const res = await fetch(`/app/quotes/api/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    if (!res.ok) throw new Error("Archive failed");
    setQuotes(prev => prev.filter(q => q.id !== id));
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/app/quotes/api/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    setQuotes(prev => prev.filter(q => q.id !== id));
  }

  if (quotes.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
        No quotes yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {quotes.map(q => (
        <SwipeActionRow
          key={q.id}
          itemId={q.id}
          openItemId={openSwipeId}
          setOpenItemId={setOpenSwipeId}
          onArchive={() => handleArchive(q.id)}
          onDelete={() => handleDelete(q.id)}
          archiveLabel="Archive"
          archiveColor="#64748b"
          deleteConfirmMessage={`Permanently delete this quote? This cannot be undone.`}
        >
          <Link
            href={`/app/quotes/${q.id}`}
            className={`block p-4 ${q.status === "archived" ? "bg-gray-50" : "bg-white"}`}
            style={{ pointerEvents: openSwipeId === q.id ? "none" : "auto" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-slate-800">{customerMap[q.customer_id] ?? "Unknown"}</p>
                <p className="text-xs text-gray-400">
                  Quote #{q.id.slice(0, 8)} · {new Date(q.created_at).toLocaleDateString()}
                </p>
                {openedSet.has(q.id) && (
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">👁 Opened</p>
                )}
                {!openedSet.has(q.id) && q.status === "sent" && (
                  <p className="text-xs text-gray-400 mt-0.5">Not opened yet</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[q.status] ?? "bg-gray-100"}`}>
                  {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                </span>
                <span className="text-base font-bold text-slate-800">
                  ${Number(q.total_amount).toLocaleString()}
                </span>
              </div>
            </div>
          </Link>
        </SwipeActionRow>
      ))}
    </div>
  );
}
