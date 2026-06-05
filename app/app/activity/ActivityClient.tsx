"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type LogEntry = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  description: string | null;
  created_at: string;
  user_id: string | null;
};

const ENTITY_META: Record<string, { emoji: string; color: string; href: (id: string) => string }> = {
  job:      { emoji: "🔧", color: "bg-blue-100 text-blue-700",   href: id => `/app/jobs/${id}` },
  quote:    { emoji: "📄", color: "bg-indigo-100 text-indigo-700", href: id => `/app/quotes/${id}` },
  invoice:  { emoji: "💵", color: "bg-green-100 text-green-700",  href: id => `/app/invoices/${id}` },
  lead:     { emoji: "🎯", color: "bg-orange-100 text-orange-700", href: id => `/app/leads/${id}` },
  customer: { emoji: "👤", color: "bg-purple-100 text-purple-700", href: id => `/app/customers/${id}` },
  expense:  { emoji: "💸", color: "bg-amber-100 text-amber-700",  href: () => `/app/expenses` },
  note:     { emoji: "📝", color: "bg-gray-100 text-gray-600",    href: () => `/app` },
};

const ACTION_COLORS: Record<string, string> = {
  created:        "text-green-600",
  updated:        "text-blue-600",
  status_changed: "text-amber-600",
  completed:      "text-green-600",
  paid:           "text-green-700",
  sent:           "text-indigo-600",
  converted:      "text-purple-600",
  signed:         "text-teal-600",
  requested:      "text-orange-600",
  note_added:     "text-gray-500",
  deleted:        "text-red-500",
};

const FILTER_TABS = ["All", "Jobs", "Quotes", "Invoices", "Leads", "Expenses"] as const;
type FilterTab = typeof FILTER_TABS[number];

const TAB_TO_TYPE: Record<FilterTab, string | null> = {
  All: null, Jobs: "job", Quotes: "quote", Invoices: "invoice", Leads: "lead", Expenses: "expense",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ActivityClient({ logs }: { logs: LogEntry[] }) {
  const [activeTab, setActiveTab] = useState<FilterTab>("All");

  const filtered = useMemo(() => {
    const type = TAB_TO_TYPE[activeTab];
    if (!type) return logs;
    return logs.filter(l => l.entity_type === type);
  }, [logs, activeTab]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    for (const log of filtered) {
      const d = new Date(log.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let label: string;
      if (d.toDateString() === today.toDateString()) label = "Today";
      else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
      else label = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(log);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <>
      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {FILTER_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab ? "text-white" : "bg-white text-gray-600 border border-gray-100"
            }`}
            style={activeTab === tab ? { backgroundColor: "#1B3A6B" } : {}}>
            {tab}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {grouped.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold text-slate-700">No activity yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
            Activity gets logged automatically as you work — creating jobs, sending quotes, logging expenses, and more.
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        {grouped.map(([dateLabel, entries]) => (
          <div key={dateLabel}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">{dateLabel}</p>
            <div className="space-y-2">
              {entries.map(log => {
                const meta = ENTITY_META[log.entity_type] ?? { emoji: "🔹", color: "bg-gray-100 text-gray-600", href: () => "/app" };
                const href = meta.href(log.entity_id);
                const actionColor = ACTION_COLORS[log.action] ?? "text-gray-500";
                return (
                  <Link
                    key={log.id}
                    href={href}
                    className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm active:bg-gray-50 transition-colors block">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-lg shrink-0 ${meta.color}`}>
                      {meta.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">
                        {log.description ?? `${log.entity_type} ${log.action}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-semibold capitalize ${actionColor}`}>{log.action.replace(/_/g, " ")}</span>
                        <span className="text-[10px] text-gray-400">·</span>
                        <span className="text-[10px] text-gray-400">{timeAgo(log.created_at)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
