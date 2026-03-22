"use client";

import { useState, useTransition } from "react";

type MembershipRow = {
  orgId: string;
  orgName: string;
  isDemo: boolean;
  orgCreatedAt: string;
  ownerEmail: string | null;
  ownerName: string | null;
  lastSignIn: string | null;
  membership: any | null;
  legacySub: any | null;
};

type Action =
  | "cancel" | "reactivate" | "pause" | "mark_past_due" | "mark_active"
  | "extend" | "comp" | "comp_indefinitely" | "change_plan" | "change_status" | "add_note";

const STATUS_BADGE: Record<string, string> = {
  active:    "bg-green-100 text-green-700",
  trialing:  "bg-blue-100 text-blue-700",
  comped:    "bg-purple-100 text-purple-700",
  past_due:  "bg-amber-100 text-amber-700",
  paused:    "bg-gray-100 text-gray-500",
  canceled:  "bg-red-100 text-red-600",
  expired:   "bg-red-50 text-red-400",
  none:      "bg-gray-100 text-gray-400",
};

const PLANS = ["none", "standard", "founder", "comp"];
const STATUSES = ["trialing", "active", "comped", "paused", "past_due", "canceled", "expired"];

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function derivedStatus(row: MembershipRow): string {
  if (row.membership) return row.membership.status ?? "none";
  if (row.legacySub) {
    const now = Date.now();
    const nextDue = new Date(row.legacySub.next_due_date).getTime();
    const graceEnd = new Date(row.legacySub.grace_period_end_date).getTime();
    if (row.legacySub.subscription_status === "canceled" && now > graceEnd) return "canceled";
    if (now <= nextDue) return "active";
    if (now > nextDue && now <= graceEnd) return "past_due";
    return "expired";
  }
  return "none";
}

function derivedPeriodEnd(row: MembershipRow): string | null {
  if (row.membership?.current_period_end) return row.membership.current_period_end;
  if (row.legacySub?.next_due_date) return row.legacySub.next_due_date;
  return null;
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg text-white max-w-xs text-center ${ok ? "bg-green-600" : "bg-red-600"}`}>
      {msg}
    </div>
  );
}

function ConfirmModal({
  title, body, onConfirm, onCancel, danger = false,
  children,
}: {
  title: string; body: string; onConfirm: () => void; onCancel: () => void; danger?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4">
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
        <p className="text-sm text-gray-500">{body}</p>
        {children}
        <div className="flex gap-2 pt-1">
          <button onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-white font-semibold text-sm ${danger ? "bg-red-600" : ""}`}
            style={danger ? {} : { backgroundColor: "#1B3A6B" }}>
            Confirm
          </button>
          <button onClick={onCancel}
            className="rounded-xl px-4 py-2.5 border border-gray-200 text-sm font-semibold text-slate-600">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionDrawer({
  row, onClose, onSuccess, actorEmail,
}: {
  row: MembershipRow; onClose: () => void; onSuccess: (orgId: string, updated: any) => void; actorEmail: string;
}) {
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<{ action: Action; title: string; body: string; danger?: boolean } | null>(null);
  const [days, setDays] = useState(30);
  const [plan, setPlan] = useState(row.membership?.plan ?? "standard");
  const [status, setStatus] = useState(row.membership?.status ?? "active");
  const [note, setNote] = useState(row.membership?.admin_notes ?? "");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function doAction(action: Action, extra?: Record<string, any>) {
    startTransition(async () => {
      try {
        const res = await fetch(`/app/admin/memberships/api/${row.orgId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, actorEmail, ...extra }),
        });
        const json = await res.json() as any;
        if (!res.ok) throw new Error(json.error ?? "Failed");
        onSuccess(row.orgId, json);
        showToast("Done!", true);
        setModal(null);
      } catch (err: any) {
        showToast(err.message ?? "Error", false);
        setModal(null);
      }
    });
  }

  return (
    <>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
      <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/30 px-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="p-4 border-b border-gray-100">
            <p className="font-bold text-slate-800 text-base">{row.orgName}</p>
            <p className="text-xs text-gray-400">{row.ownerEmail ?? "No owner email"}</p>
          </div>

          <div className="p-4 space-y-4">
            {/* Plan */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Change Plan</label>
              <div className="flex gap-2">
                <select value={plan} onChange={(e) => setPlan(e.target.value)}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none">
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <button onClick={() => setModal({ action: "change_plan", title: `Change plan to "${plan}"?`, body: `This will update the plan for ${row.orgName}.` })}
                  disabled={pending}
                  className="rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#1B3A6B" }}>Apply</button>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Change Status</label>
              <div className="flex gap-2">
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => setModal({ action: "change_status", title: `Set status to "${status}"?`, body: `This will update the membership status for ${row.orgName}.` })}
                  disabled={pending}
                  className="rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#1B3A6B" }}>Apply</button>
              </div>
            </div>

            {/* Extend */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Extend Access (days)</label>
              <div className="flex gap-2">
                <input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))}
                  className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                <button onClick={() => setModal({ action: "extend", title: `Extend ${row.orgName} by ${days} days?`, body: "This extends current_period_end from today or the current end date." })}
                  disabled={pending}
                  className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#1B3A6B" }}>Extend</button>
              </div>
            </div>

            {/* Comp */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Grant Comp Time (days)</label>
              <div className="flex gap-2">
                <input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))}
                  className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                <button onClick={() => setModal({ action: "comp", title: `Comp ${row.orgName} for ${days} days?`, body: "Sets status=comped and comped_until=today+days." })}
                  disabled={pending}
                  className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold bg-purple-600 text-white disabled:opacity-50">Comp</button>
              </div>
            </div>

            {/* Quick actions */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Quick Actions</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setModal({ action: "reactivate", title: "Reactivate?", body: `Set ${row.orgName} to active status.` })}
                  disabled={pending}
                  className="rounded-xl px-3 py-2 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 disabled:opacity-50">
                  ✓ Reactivate
                </button>
                <button onClick={() => setModal({ action: "mark_active", title: "Mark Active?", body: `Manually set ${row.orgName} to active.` })}
                  disabled={pending}
                  className="rounded-xl px-3 py-2 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 disabled:opacity-50">
                  Mark Active
                </button>
                <button onClick={() => setModal({ action: "pause", title: "Pause membership?", body: `Pausing will block access for ${row.orgName}.` })}
                  disabled={pending}
                  className="rounded-xl px-3 py-2 text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200 disabled:opacity-50">
                  ⏸ Pause
                </button>
                <button onClick={() => setModal({ action: "mark_past_due", title: "Mark Past Due?", body: `Flag ${row.orgName} as past due.` })}
                  disabled={pending}
                  className="rounded-xl px-3 py-2 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 disabled:opacity-50">
                  Past Due
                </button>
                <button onClick={() => setModal({ action: "comp_indefinitely", title: "Comp indefinitely?", body: `This gives ${row.orgName} permanent free access. Requires extra confirmation.`, danger: true })}
                  disabled={pending}
                  className="rounded-xl px-3 py-2 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 disabled:opacity-50">
                  Comp ∞
                </button>
                <button onClick={() => setModal({ action: "cancel", title: "Cancel membership?", body: `This will cancel access for ${row.orgName}. This cannot be undone without reactivating.`, danger: true })}
                  disabled={pending}
                  className="rounded-xl px-3 py-2 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 disabled:opacity-50">
                  ✕ Cancel
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Internal Notes</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                placeholder="Admin-only notes…"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
              <button onClick={() => doAction("add_note", { note })}
                disabled={pending}
                className="mt-1.5 w-full rounded-xl py-2 text-xs font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: "#1B3A6B" }}>Save Note</button>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <ConfirmModal
          title={modal.title}
          body={modal.body}
          danger={modal.danger}
          onCancel={() => setModal(null)}
          onConfirm={() => {
            const extra: Record<string, any> = {};
            if (modal.action === "change_plan") extra.plan = plan;
            if (modal.action === "change_status") extra.newStatus = status;
            if (["extend", "comp"].includes(modal.action)) extra.days = days;
            doAction(modal.action, extra);
          }}
        />
      )}
    </>
  );
}

export default function MembershipsClient({ rows, actorEmail }: { rows: MembershipRow[]; actorEmail: string }) {
  const [data, setData] = useState(rows);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [drawerRow, setDrawerRow] = useState<MembershipRow | null>(null);

  const filtered = data.filter((row) => {
    const s = derivedStatus(row);
    if (statusFilter !== "all" && s !== statusFilter) return false;
    if (planFilter !== "all" && (row.membership?.plan ?? "none") !== planFilter) return false;
    if (!q.trim()) return true;
    const search = q.toLowerCase();
    return (
      row.orgName.toLowerCase().includes(search) ||
      (row.ownerEmail ?? "").toLowerCase().includes(search)
    );
  });

  function handleSuccess(orgId: string, updated: any) {
    setData((prev) => prev.map((r) => r.orgId === orgId ? { ...r, membership: updated } : r));
    setDrawerRow((prev) => prev ? { ...prev, membership: updated } : prev);
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Search org or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 min-w-0 rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none">
            <option value="all">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            <option value="none">none</option>
          </select>
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none">
            <option value="all">All Plans</option>
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <p className="text-xs text-gray-400">{filtered.length} of {data.length} orgs</p>

        <div className="space-y-2">
          {filtered.map((row) => {
            const status = derivedStatus(row);
            const periodEnd = derivedPeriodEnd(row);
            const badgeCls = STATUS_BADGE[status] ?? STATUS_BADGE.none;

            return (
              <div key={row.orgId} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">{row.orgName}</p>
                      {row.isDemo && <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-semibold">DEMO</span>}
                      <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${badgeCls}`}>{status}</span>
                      {row.membership?.plan && row.membership.plan !== "none" && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-semibold">{row.membership.plan}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{row.ownerEmail ?? "No email"}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-[11px] text-gray-400">
                      <span>Period end: {fmtDate(periodEnd)}</span>
                      {row.membership?.trial_ends_at && <span>Trial: {fmtDate(row.membership.trial_ends_at)}</span>}
                      {row.membership?.comped_until !== undefined && row.membership?.status === "comped" && (
                        <span>Comp: {row.membership.comped_until ? fmtDate(row.membership.comped_until) : "∞"}</span>
                      )}
                      <span>Last active: {fmtDate(row.lastSignIn)}</span>
                    </div>
                    {row.membership?.admin_notes && (
                      <p className="text-[11px] text-gray-400 italic mt-1 truncate">📝 {row.membership.admin_notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => setDrawerRow(row)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                      style={{ backgroundColor: "#1B3A6B" }}>
                      Actions
                    </button>
                    <a href={`/app/admin/memberships/${row.orgId}`}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#1B3A6B] border border-gray-200 text-center">
                      Detail
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm">
            No memberships match your filters.
          </div>
        )}
      </div>

      {drawerRow && (
        <ActionDrawer
          row={drawerRow}
          actorEmail={actorEmail}
          onClose={() => setDrawerRow(null)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
