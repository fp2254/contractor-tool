"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CalJob = {
  id: string;
  title: string;
  status: string;
  scheduledDate: string;
  assignedTo: string | null;
  customerName: string;
};

type Member = { userId: string; name: string };

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const MEMBER_COLORS = [
  "#1B3A6B", "#DC2626", "#059669", "#D97706", "#7C3AED", "#DB2777", "#0891B2", "#65A30D",
];

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}
function today() {
  return toYMD(new Date());
}
function fmtFull(ymd: string) {
  const d = new Date(ymd + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function TeamCalendar({ jobs, members }: { jobs: CalJob[]; members: Member[] }) {
  const [selectedDate, setSelectedDate] = useState(today());
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [showAssignModal, setShowAssignModal] = useState(false);

  const memberColor = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m, i) => { map[m.userId] = MEMBER_COLORS[i % MEMBER_COLORS.length]; });
    return map;
  }, [members]);

  const memberName = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach(m => { map[m.userId] = m.name; });
    return map;
  }, [members]);

  const jobsByDate = useMemo(() => {
    const map: Record<string, CalJob[]> = {};
    for (const j of jobs) {
      if (!map[j.scheduledDate]) map[j.scheduledDate] = [];
      map[j.scheduledDate].push(j);
    }
    return map;
  }, [jobs]);

  const { year, month } = cursor;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    setCursor(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 });
  }
  function nextMonth() {
    setCursor(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 });
  }

  const todayStr = today();
  const dayJobs = jobsByDate[selectedDate] ?? [];

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="text-sm font-semibold text-slate-700">{MONTH_NAMES[month]} {year}</p>
          <button onClick={nextMonth} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-7 pb-2">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
          ))}
          {cells.map((ymd, i) => {
            if (!ymd) return <div key={`empty-${i}`} className="aspect-square" />;
            const dj = jobsByDate[ymd] ?? [];
            const isToday = ymd === todayStr;
            const isSelected = ymd === selectedDate;
            return (
              <button
                key={ymd}
                onClick={() => { setSelectedDate(ymd); setShowAssignModal(false); }}
                className="flex flex-col items-center py-1 gap-0.5">
                <span className={`text-xs w-7 h-7 flex items-center justify-center rounded-full font-medium
                  ${isSelected ? "bg-[#1B3A6B] text-white" : isToday ? "border-2 border-[#1B3A6B] text-[#1B3A6B] font-bold" : "text-slate-700"}`}>
                  {parseInt(ymd.slice(8))}
                </span>
                <div className="flex gap-0.5 justify-center flex-wrap min-h-[6px] max-w-[28px]">
                  {dj.slice(0, 3).map((j, idx) => (
                    <span key={idx} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: j.assignedTo ? memberColor[j.assignedTo] ?? "#94A3B8" : "#CBD5E1" }} />
                  ))}
                  {dj.length > 3 && <span className="text-[8px] text-gray-400">+{dj.length - 3}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {members.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap px-1">
          {members.map(m => (
            <div key={m.userId} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: memberColor[m.userId] }} />
              <span className="text-xs text-gray-500">{m.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">{fmtFull(selectedDate)}</p>
          <button
            onClick={() => setShowAssignModal(true)}
            className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: "#1B3A6B" }}>
            + Assign Job
          </button>
        </div>

        {dayJobs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">Nothing scheduled this day.</p>
        ) : (
          <div className="space-y-1.5">
            {dayJobs.map(j => (
              <a key={j.id} href={`/app/jobs/${j.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 hover:bg-gray-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{j.title}</p>
                  <p className="text-xs text-gray-400 truncate">{j.customerName}</p>
                </div>
                <span
                  className="text-[10px] font-semibold rounded-full px-2 py-0.5 ml-2 shrink-0"
                  style={{
                    backgroundColor: j.assignedTo ? `${memberColor[j.assignedTo]}1A` : "#F1F5F9",
                    color: j.assignedTo ? memberColor[j.assignedTo] : "#94A3B8",
                  }}>
                  {j.assignedTo ? memberName[j.assignedTo] ?? "Unknown" : "Unassigned"}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      {showAssignModal && (
        <DayAssignModal
          date={selectedDate}
          members={members}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
}

function DayAssignModal({ date, members, onClose }: { date: string; members: Member[]; onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [assignedTo, setAssignedTo] = useState(members[0]?.userId ?? "");
  const [jobTitle, setJobTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customers, setCustomers] = useState<{ id: string; name: string }[] | null>(null);
  const [unscheduledJobs, setUnscheduledJobs] = useState<{ id: string; title: string; customerName: string }[] | null>(null);
  const [existingJobId, setExistingJobId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useState(() => {
    (async () => {
      try {
        const res = await fetch("/api/team/day-assign-options");
        if (res.ok) {
          const json = await res.json();
          setCustomers(json.customers ?? []);
          setUnscheduledJobs(json.unscheduledJobs ?? []);
        }
      } catch {
        setCustomers([]);
        setUnscheduledJobs([]);
      }
    })();
  });

  async function handleSubmit() {
    setError("");
    if (mode === "new") {
      if (!jobTitle.trim() || !customerId) { setError("Job title and customer are required."); return; }
      setSubmitting(true);
      try {
        const res = await fetch("/app/jobs/new/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_id: customerId,
            job_title: jobTitle,
            scheduled_date: date,
            assigned_to: assignedTo || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to create job");
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create job");
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!existingJobId) { setError("Choose a job to schedule."); return; }
      setSubmitting(true);
      try {
        await Promise.all([
          fetch(`/api/jobs/${existingJobId}/reschedule`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scheduled_date: date }),
          }),
          fetch("/api/team/assign", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entityType: "job", entityId: existingJobId, assignedTo: assignedTo || null }),
          }),
        ]);
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to assign job");
      } finally {
        setSubmitting(false);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-4 space-y-3 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">Assign job — {fmtFull(date)}</p>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none px-1">✕</button>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setMode("new")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold ${mode === "new" ? "bg-white text-slate-800 shadow-sm" : "text-gray-500"}`}>
            New Job
          </button>
          <button
            onClick={() => setMode("existing")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold ${mode === "existing" ? "bg-white text-slate-800 shadow-sm" : "text-gray-500"}`}>
            Existing Job
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Assign To</label>
          <select
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100">
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.userId} value={m.userId}>{m.name}</option>)}
          </select>
        </div>

        {mode === "new" ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Job Title *</label>
              <input
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="e.g. Roof repair"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Customer *</label>
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">{customers === null ? "Loading…" : "Select customer…"}</option>
                {(customers ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Job *</label>
            <select
              value={existingJobId}
              onChange={e => setExistingJobId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100">
              <option value="">{unscheduledJobs === null ? "Loading…" : "Select job…"}</option>
              {(unscheduledJobs ?? []).map(j => <option key={j.id} value={j.id}>{j.title} — {j.customerName}</option>)}
            </select>
            {unscheduledJobs?.length === 0 && (
              <p className="text-xs text-gray-400 mt-1.5">No unscheduled jobs available — try creating a new one instead.</p>
            )}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-xl py-3 text-white font-semibold disabled:opacity-60"
          style={{ backgroundColor: "#1B3A6B" }}>
          {submitting ? "Saving…" : "Assign"}
        </button>
      </div>
    </div>
  );
}
