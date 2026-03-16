"use client";

import { useState } from "react";
import Link from "next/link";
import { SwipeActionRow } from "@/components/SwipeActionRow";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-400",
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
  const [quotes, setQuotes] = useState(initialQuotes);
  const openedSet = new Set(openedIds);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  const activeQuotes = quotes.filter(q => q.status !== "archived");
  const archivedQuotes = quotes.filter(q => q.status === "archived");

  async function handleArchive(id: string) {
    const res = await fetch(`/app/quotes/api/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    if (!res.ok) throw new Error("Archive failed");
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: "archived" } : q));
    setOpenSwipeId(null);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/app/quotes/api/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    setQuotes(prev => prev.filter(q => q.id !== id));
    setOpenSwipeId(null);
  }

  async function handleUnarchive(id: string) {
    const res = await fetch(`/app/quotes/api/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "draft" }),
    });
    if (!res.ok) throw new Error("Unarchive failed");
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: "draft" } : q));
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("active")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "active" ? "text-white" : "bg-white text-gray-600 shadow-sm"
          }`}
          style={activeTab === "active" ? { backgroundColor: "#1B3A6B" } : {}}>
          Active {activeQuotes.length > 0 && <span className="opacity-70">{activeQuotes.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab("archived")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "archived" ? "text-white" : "bg-white text-gray-600 shadow-sm"
          }`}
          style={activeTab === "archived" ? { backgroundColor: "#1B3A6B" } : {}}>
          Archived {archivedQuotes.length > 0 && <span className="opacity-70">{archivedQuotes.length}</span>}
        </button>
      </div>

      {activeTab === "active" ? (
        activeQuotes.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
            No quotes yet.
          </div>
        ) : (
          activeQuotes.map(q => (
            <SwipeActionRow
              key={q.id}
              itemId={q.id}
              openItemId={openSwipeId}
              setOpenItemId={setOpenSwipeId}
              onArchive={() => handleArchive(q.id)}
              onDelete={() => handleDelete(q.id)}
              archiveLabel="Archive"
              archiveColor="#64748b"
              deleteConfirmMessage="Permanently delete this quote? This cannot be undone.">
              <Link
                href={`/app/quotes/${q.id}`}
                className="block p-4 bg-white"
                style={{ pointerEvents: openSwipeId === q.id ? "none" : "auto" }}>
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
          ))
        )
      ) : (
        archivedQuotes.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
            No archived quotes.
          </div>
        ) : (
          <div className="space-y-3">
            {archivedQuotes.map(q => (
              <div key={q.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <Link href={`/app/quotes/${q.id}`} className="block p-4 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{customerMap[q.customer_id] ?? "Unknown"}</p>
                      <p className="text-xs text-gray-400">
                        Quote #{q.id.slice(0, 8)} · {new Date(q.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-gray-100 text-gray-400">
                        Archived
                      </span>
                      <span className="text-base font-bold text-slate-800">
                        ${Number(q.total_amount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between">
                  <button
                    onClick={() => handleUnarchive(q.id)}
                    className="flex items-center gap-1.5 text-xs text-[#1B3A6B] font-medium py-1 px-2 rounded-lg active:bg-blue-50">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Unarchive
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Permanently delete this quote? This cannot be undone.")) {
                        handleDelete(q.id);
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs text-red-500 font-medium py-1 px-2 rounded-lg active:bg-red-50">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
