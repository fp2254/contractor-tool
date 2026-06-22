"use client";

import { useState } from "react";
import Link from "next/link";

type WorkItem = { id: string; customerName: string; status: string; amount?: number | null; title?: string; scheduledDate?: string | null };

type MemberWithWork = {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  jobs: (WorkItem & { title: string; scheduledDate: string | null })[];
  quotes: (WorkItem & { amount: number | null })[];
  invoices: (WorkItem & { amount: number | null })[];
};

const ROLE_COLORS: Record<string, string> = {
  owner:  "bg-amber-100 text-amber-700",
  admin:  "bg-blue-100 text-blue-700",
  member: "bg-gray-100 text-gray-600",
};

const JOB_STATUS_COLORS: Record<string, string> = {
  scheduled:   "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed:   "bg-green-100 text-green-700",
  cancelled:   "bg-red-100 text-red-100",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(n: number | null | undefined) {
  return n != null ? `$${Number(n).toLocaleString()}` : "";
}

function initials(name: string | null, email: string) {
  if (name) return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

function displayName(m: { name: string | null; email: string }) {
  return m.name ?? m.email;
}

function MemberCard({
  m,
  isAdmin,
  expanded,
  onToggle,
}: {
  m: MemberWithWork;
  isAdmin: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const totalWork = m.jobs.length + m.quotes.length + m.invoices.length;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header row */}
      <button className="w-full flex items-center gap-3 px-4 py-3 text-left" onClick={onToggle}>
        <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ backgroundColor: "#1B3A6B" }}>
          {initials(m.name, m.email)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{displayName(m)}</p>
          <p className="text-xs text-gray-400 truncate">{m.email}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-semibold rounded-full px-2.5 py-1 capitalize ${ROLE_COLORS[m.role] ?? ROLE_COLORS.member}`}>
            {m.role}
          </span>
          {totalWork > 0 && (
            <span className="text-xs font-bold rounded-full px-2 py-0.5 bg-slate-100 text-slate-600">
              {totalWork}
            </span>
          )}
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-50 px-4 pb-4 space-y-4 pt-3">
          {/* Workload stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Jobs", count: m.jobs.length, color: "bg-blue-50 text-blue-700" },
              { label: "Quotes", count: m.quotes.length, color: "bg-purple-50 text-purple-700" },
              { label: "Invoices", count: m.invoices.length, color: "bg-green-50 text-green-700" },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-2.5 text-center ${s.color}`}>
                <p className="text-xl font-bold">{s.count}</p>
                <p className="text-xs font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Assigned jobs */}
          {m.jobs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Jobs</p>
              <div className="space-y-1.5">
                {m.jobs.map(j => (
                  <Link key={j.id} href={`/app/jobs/${j.id}`}
                    className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{j.title}</p>
                      <p className="text-xs text-gray-400">{j.customerName}{j.scheduledDate ? ` · ${fmtDate(j.scheduledDate)}` : ""}</p>
                    </div>
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ml-2 shrink-0 capitalize ${JOB_STATUS_COLORS[j.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {j.status.replace(/_/g, " ")}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Assigned quotes */}
          {m.quotes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Quotes</p>
              <div className="space-y-1.5">
                {m.quotes.map(q => (
                  <Link key={q.id} href={`/app/quotes/${q.id}`}
                    className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{q.customerName}</p>
                      <p className="text-xs text-gray-400 capitalize">{q.status}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-700 ml-2 shrink-0">{fmtMoney(q.amount)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Assigned invoices */}
          {m.invoices.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Invoices</p>
              <div className="space-y-1.5">
                {m.invoices.map(i => (
                  <Link key={i.id} href={`/app/invoices/${i.id}`}
                    className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{i.customerName}</p>
                      <p className="text-xs text-gray-400 capitalize">{i.status === "unpaid" ? "open" : i.status}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-700 ml-2 shrink-0">{fmtMoney(i.amount)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {totalWork === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">No work assigned yet.</p>
          )}

          {/* Admin quick-create links */}
          {isAdmin && (
            <div className="pt-2 border-t border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Assign new work</p>
              <div className="grid grid-cols-3 gap-2">
                <Link href={`/app/jobs/new?assignTo=${m.userId}`}
                  className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-gray-200 py-3 text-xs font-semibold text-gray-500 hover:border-blue-200 hover:text-blue-600">
                  <span className="text-lg">🔨</span>
                  New Job
                </Link>
                <Link href={`/app/quotes/new?assignTo=${m.userId}`}
                  className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-gray-200 py-3 text-xs font-semibold text-gray-500 hover:border-blue-200 hover:text-blue-600">
                  <span className="text-lg">📋</span>
                  New Quote
                </Link>
                <Link href={`/app/invoices/new?assignTo=${m.userId}`}
                  className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-gray-200 py-3 text-xs font-semibold text-gray-500 hover:border-blue-200 hover:text-blue-600">
                  <span className="text-lg">📄</span>
                  New Invoice
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TeamClient({
  members,
  isAdmin,
  currentUserId,
  orgId,
}: {
  members: MemberWithWork[];
  isAdmin: boolean;
  currentUserId: string;
  orgId: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (res.ok) {
        setInviteMsg({ ok: true, text: `Invite sent to ${inviteEmail.trim()}` });
        setInviteEmail("");
        setShowInvite(false);
      } else {
        setInviteMsg({ ok: false, text: json.error ?? "Failed to send invite" });
      }
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="space-y-3">
      {inviteMsg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${inviteMsg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {inviteMsg.text}
        </div>
      )}

      {members.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
          <p className="text-3xl mb-2">👥</p>
          <p className="font-medium text-slate-600 mb-1">No team members yet</p>
          <p className="text-sm">Invite someone to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <MemberCard
              key={m.userId}
              m={m}
              isAdmin={isAdmin}
              expanded={expandedId === m.userId}
              onToggle={() => setExpandedId(prev => prev === m.userId ? null : m.userId)}
            />
          ))}
        </div>
      )}

      {isAdmin && (
        <>
          {showInvite ? (
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Invite a team member</p>
              <form onSubmit={handleInvite} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="their@email.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={inviting}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: "#1B3A6B" }}>
                    {inviting ? "Sending…" : "Send Invite"}
                  </button>
                  <button type="button"
                    onClick={() => { setShowInvite(false); setInviteEmail(""); }}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold bg-gray-100 text-gray-600">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button onClick={() => setShowInvite(true)}
              className="w-full rounded-xl py-3 text-white font-semibold flex items-center justify-center gap-2"
              style={{ backgroundColor: "#1B3A6B" }}>
              <span className="text-lg leading-none">+</span> Invite Team Member
            </button>
          )}
          <p className="text-xs text-gray-400 text-center px-4">
            Team members receive an email to join your TradeBase workspace.
          </p>
        </>
      )}
    </div>
  );
}
