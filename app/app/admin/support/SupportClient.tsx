"use client";

import { useState } from "react";

type Ticket = {
  id: string;
  type: string;
  title: string;
  description: string;
  screenshot_url: string | null;
  user_id: string | null;
  user_email: string | null;
  status: string;
  priority: string;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = { bug: "🐛 Bug", feature: "💡 Feature", feedback: "💬 Feedback" };
const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  closed: "bg-gray-100 text-gray-500",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-500",
  medium: "bg-orange-100 text-orange-700",
  high: "bg-red-100 text-red-700",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function SupportClient({ initialTickets }: { initialTickets: Ticket[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const filtered = tickets.filter((t) => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  });

  async function updateTicket(id: string, field: "status" | "priority", value: string) {
    setUpdating(id + field);
    try {
      const res = await fetch(`/api/admin/support/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setTickets((prev) => prev.map((t) => t.id === id ? { ...t, [field]: value } : t));
      }
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
          {["all", "bug", "feature", "feedback"].map((v) => (
            <button key={v} onClick={() => setFilterType(v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterType === v ? "bg-[#1B3A6B] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
              {v === "all" ? "All Types" : TYPE_LABELS[v]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
          {["all", "open", "in_progress", "closed"].map((v) => (
            <button key={v} onClick={() => setFilterStatus(v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterStatus === v ? "bg-[#1B3A6B] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
              {v === "all" ? "All Status" : v === "in_progress" ? "In Progress" : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} of {tickets.length} tickets</p>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 p-6 text-center">No tickets match the current filters.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((ticket) => (
              <div key={ticket.id}>
                <div
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(expanded === ticket.id ? null : ticket.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium text-gray-500">{TYPE_LABELS[ticket.type] ?? ticket.type}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[ticket.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {ticket.status === "in_progress" ? "In Progress" : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[ticket.priority] ?? "bg-gray-100 text-gray-500"}`}>
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">{ticket.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {ticket.user_email ?? "Unknown user"} · {fmtDate(ticket.created_at)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-300 mt-1">{expanded === ticket.id ? "▲" : "▼"}</span>
                </div>

                {expanded === ticket.id && (
                  <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-3">
                    {/* Description */}
                    <div className="pt-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                    </div>

                    {/* Screenshot */}
                    {ticket.screenshot_url && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Screenshot</p>
                        <a href={ticket.screenshot_url} target="_blank" rel="noopener noreferrer">
                          <img src={ticket.screenshot_url} alt="Screenshot" className="max-h-48 rounded-xl border border-gray-200 object-cover" />
                        </a>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div><span className="font-semibold">User ID:</span><br /><span className="font-mono text-[10px] break-all">{ticket.user_id ?? "—"}</span></div>
                      <div><span className="font-semibold">Ticket ID:</span><br /><span className="font-mono text-[10px] break-all">{ticket.id}</span></div>
                    </div>

                    {/* Update controls */}
                    <div className="flex gap-3 flex-wrap pt-1">
                      <div className="flex-1 min-w-[120px]">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Status</label>
                        <select
                          value={ticket.status}
                          disabled={updating === ticket.id + "status"}
                          onChange={(e) => updateTicket(ticket.id, "status", e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-2 py-2 text-xs bg-white outline-none focus:border-blue-400">
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Priority</label>
                        <select
                          value={ticket.priority}
                          disabled={updating === ticket.id + "priority"}
                          onChange={(e) => updateTicket(ticket.id, "priority", e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-2 py-2 text-xs bg-white outline-none focus:border-blue-400">
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
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
