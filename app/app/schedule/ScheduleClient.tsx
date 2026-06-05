"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Job = {
  id: string;
  job_title: string;
  status: string;
  scheduled_date: string;
  address: string | null;
  city: string | null;
  state: string | null;
  customer_name: string;
  is_recurring?: boolean | null;
};

type View = "month" | "week" | "day";

const STATUS_COLOR: Record<string, string> = {
  scheduled:   "bg-blue-500",
  in_progress: "bg-amber-500",
  completed:   "bg-green-500",
  cancelled:   "bg-red-400",
};
const STATUS_BADGE: Record<string, string> = {
  scheduled:   "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed:   "bg-green-100 text-green-700",
  cancelled:   "bg-red-100 text-red-600",
};
const STATUS_LABEL: Record<string, string> = {
  scheduled:   "Scheduled",
  in_progress: "In Progress",
  completed:   "Completed",
  cancelled:   "Cancelled",
};

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}
function today() {
  return toYMD(new Date());
}
function addDays(ymd: string, n: number) {
  const d = new Date(ymd + "T12:00:00");
  d.setDate(d.getDate() + n);
  return toYMD(d);
}

function fmtFull(ymd: string) {
  const d = new Date(ymd + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function fmtShort(ymd: string) {
  const d = new Date(ymd + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function JobCard({ job, onReschedule }: { job: Job; onReschedule: (id: string, date: string) => void }) {
  const [showPicker, setShowPicker] = useState(false);
  const [newDate, setNewDate] = useState(job.scheduled_date);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save() {
    if (!newDate || newDate === job.scheduled_date) { setShowPicker(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_date: newDate }),
      });
      if (res.ok) {
        onReschedule(job.id, newDate);
        setShowPicker(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-stretch">
        <div className={`w-1.5 flex-shrink-0 ${STATUS_COLOR[job.status] ?? "bg-gray-300"}`} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-slate-800 text-sm leading-tight truncate">{job.job_title}</p>
                {job.is_recurring && <span title="Recurring job" className="text-blue-500 shrink-0 text-xs">🔁</span>}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{job.customer_name}</p>
              {(job.address || job.city) && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {[job.address, job.city, job.state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${STATUS_BADGE[job.status] ?? "bg-gray-100 text-gray-500"}`}>
              {STATUS_LABEL[job.status] ?? job.status}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Link
              href={`/app/jobs/${job.id}`}
              className="flex-1 text-center text-xs font-semibold py-1.5 rounded-lg bg-gray-100 text-slate-700">
              Open Job
            </Link>
            <button
              onClick={() => { setShowPicker(v => !v); setNewDate(job.scheduled_date); }}
              className="flex-1 text-center text-xs font-semibold py-1.5 rounded-lg bg-blue-50 text-[#1B3A6B]">
              Reschedule
            </button>
            {(job.address || job.city) && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent([job.address, job.city, job.state].filter(Boolean).join(", "))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-gray-100 text-gray-500">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </a>
            )}
          </div>

          {showPicker && (
            <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: "#1B3A6B" }}>
                {saving ? "…" : "Save"}
              </button>
              <button onClick={() => setShowPicker(false)} className="text-gray-400 text-sm px-1">✕</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MonthView({ jobs, selectedDate, onSelectDate }: {
  jobs: Job[];
  selectedDate: string;
  onSelectDate: (d: string) => void;
}) {
  const sel = new Date(selectedDate + "T12:00:00");
  const year = sel.getFullYear();
  const month = sel.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const jobsByDate = useMemo(() => {
    const map: Record<string, Job[]> = {};
    for (const j of jobs) {
      if (!map[j.scheduled_date]) map[j.scheduled_date] = [];
      map[j.scheduled_date].push(j);
    }
    return map;
  }, [jobs]);

  const todayStr = today();
  const selStr = selectedDate;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="grid grid-cols-7">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-2">{d}</div>
        ))}
        {cells.map((ymd, i) => {
          if (!ymd) return <div key={`empty-${i}`} className="aspect-square" />;
          const dayJobs = jobsByDate[ymd] ?? [];
          const isToday = ymd === todayStr;
          const isSelected = ymd === selStr;
          return (
            <button
              key={ymd}
              onClick={() => onSelectDate(ymd)}
              className="flex flex-col items-center py-1.5 gap-0.5 relative">
              <span className={`text-xs w-7 h-7 flex items-center justify-center rounded-full font-medium
                ${isSelected ? "bg-[#1B3A6B] text-white" : isToday ? "border-2 border-[#1B3A6B] text-[#1B3A6B] font-bold" : "text-slate-700"}`}>
                {parseInt(ymd.slice(8))}
              </span>
              <div className="flex gap-0.5 justify-center flex-wrap min-h-[6px]">
                {dayJobs.slice(0, 3).map((j, idx) => (
                  <span key={idx} className={`h-1.5 w-1.5 rounded-full ${STATUS_COLOR[j.status] ?? "bg-gray-300"}`} />
                ))}
                {dayJobs.length > 3 && <span className="text-[8px] text-gray-400">+{dayJobs.length - 3}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ jobs, selectedDate, onSelectDate }: {
  jobs: Job[];
  selectedDate: string;
  onSelectDate: (d: string) => void;
}) {
  const selD = new Date(selectedDate + "T12:00:00");
  const dow = selD.getDay();
  const weekStart = addDays(selectedDate, -dow);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const jobsByDate = useMemo(() => {
    const map: Record<string, Job[]> = {};
    for (const j of jobs) {
      if (!map[j.scheduled_date]) map[j.scheduled_date] = [];
      map[j.scheduled_date].push(j);
    }
    return map;
  }, [jobs]);

  const todayStr = today();

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-7">
          {weekDays.map(ymd => {
            const dayJobs = jobsByDate[ymd] ?? [];
            const isToday = ymd === todayStr;
            const isSelected = ymd === selectedDate;
            const dayNum = parseInt(ymd.slice(8));
            const dayLabel = DAY_LABELS[new Date(ymd + "T12:00:00").getDay()];
            return (
              <button
                key={ymd}
                onClick={() => onSelectDate(ymd)}
                className="flex flex-col items-center py-2 gap-1">
                <span className="text-[10px] font-semibold text-gray-400">{dayLabel}</span>
                <span className={`text-sm w-8 h-8 flex items-center justify-center rounded-full font-semibold
                  ${isSelected ? "bg-[#1B3A6B] text-white" : isToday ? "border-2 border-[#1B3A6B] text-[#1B3A6B]" : "text-slate-700"}`}>
                  {dayNum}
                </span>
                <div className="flex gap-0.5 justify-center min-h-[6px]">
                  {dayJobs.slice(0, 2).map((j, idx) => (
                    <span key={idx} className={`h-1.5 w-1.5 rounded-full ${STATUS_COLOR[j.status] ?? "bg-gray-300"}`} />
                  ))}
                  {dayJobs.length > 2 && <span className="text-[8px] text-gray-400">+{dayJobs.length - 2}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ScheduleClient({ jobs: initialJobs, initialDate }: { jobs: Job[]; initialDate?: string }) {
  const [view, setView] = useState<View>(initialDate ? "day" : "month");
  const [selectedDate, setSelectedDate] = useState(initialDate ?? today());
  const [jobs, setJobs] = useState(initialJobs);

  const sel = new Date(selectedDate + "T12:00:00");
  const year = sel.getFullYear();
  const month = sel.getMonth();

  function prevPeriod() {
    if (view === "month") {
      const d = new Date(year, month - 1, 1);
      setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
    } else if (view === "week") {
      setSelectedDate(addDays(selectedDate, -7));
    } else {
      setSelectedDate(addDays(selectedDate, -1));
    }
  }

  function nextPeriod() {
    if (view === "month") {
      const d = new Date(year, month + 1, 1);
      setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
    } else if (view === "week") {
      setSelectedDate(addDays(selectedDate, 7));
    } else {
      setSelectedDate(addDays(selectedDate, 1));
    }
  }

  function onReschedule(id: string, newDate: string) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, scheduled_date: newDate } : j));
  }

  function headerLabel() {
    if (view === "month") return `${MONTH_NAMES[month]} ${year}`;
    if (view === "week") {
      const dow = sel.getDay();
      const weekStart = addDays(selectedDate, -dow);
      const weekEnd = addDays(weekStart, 6);
      return `${fmtShort(weekStart)} – ${fmtShort(weekEnd)}`;
    }
    return fmtFull(selectedDate);
  }

  const dayJobs = useMemo(
    () => jobs.filter(j => j.scheduled_date === selectedDate),
    [jobs, selectedDate]
  );

  const showJobList = view === "day" || (view !== "month" && true);

  return (
    <div className="p-4 space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Schedule</h1>
        <Link
          href="/app/jobs/new"
          className="flex items-center gap-1 text-sm font-semibold text-white px-3 py-2 rounded-xl"
          style={{ backgroundColor: "#1B3A6B" }}>
          <span className="text-base leading-none">+</span> Job
        </Link>
      </div>

      {/* View toggle */}
      <div className="flex bg-white rounded-xl shadow-sm p-1 gap-1">
        {(["day", "week", "month"] as View[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors capitalize
              ${view === v ? "text-white" : "text-gray-500"}`}
            style={view === v ? { backgroundColor: "#1B3A6B" } : {}}>
            {v}
          </button>
        ))}
      </div>

      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <button onClick={prevPeriod} className="p-2 rounded-xl bg-white shadow-sm text-gray-500">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => setSelectedDate(today())}
          className="text-sm font-semibold text-slate-700 text-center flex-1 mx-2">
          {headerLabel()}
        </button>
        <button onClick={nextPeriod} className="p-2 rounded-xl bg-white shadow-sm text-gray-500">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      {view === "month" && (
        <MonthView jobs={jobs} selectedDate={selectedDate} onSelectDate={(d) => { setSelectedDate(d); setView("day"); }} />
      )}
      {view === "week" && (
        <WeekView jobs={jobs} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      )}

      {/* Job list for selected day (day view always; week view below the week strip) */}
      {(view === "day" || view === "week") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              {view === "week" ? fmtFull(selectedDate) : ""}
            </p>
            {dayJobs.length > 0 && (
              <span className="text-xs text-gray-400">{dayJobs.length} job{dayJobs.length !== 1 ? "s" : ""}</span>
            )}
          </div>
          {dayJobs.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
              <svg viewBox="0 0 24 24" className="h-10 w-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <p className="text-sm">No jobs scheduled for this day.</p>
              <Link
                href="/app/jobs/new"
                className="inline-block mt-3 text-sm font-semibold text-[#1B3A6B]">
                + Schedule a Job
              </Link>
            </div>
          ) : (
            dayJobs.map(job => (
              <JobCard key={job.id} job={job} onReschedule={onReschedule} />
            ))
          )}
        </div>
      )}

      {/* Month view: show jobs for selected day below the calendar */}
      {view === "month" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">{fmtFull(selectedDate)}</p>
            {dayJobs.length > 0 && (
              <span className="text-xs text-gray-400">{dayJobs.length} job{dayJobs.length !== 1 ? "s" : ""}</span>
            )}
          </div>
          {dayJobs.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-gray-400 shadow-sm text-sm">
              No jobs on this day.{" "}
              <Link href="/app/jobs/new" className="font-semibold text-[#1B3A6B]">+ Schedule one</Link>
            </div>
          ) : (
            dayJobs.map(job => (
              <JobCard key={job.id} job={job} onReschedule={onReschedule} />
            ))
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${color}`} />
            <span className="text-xs text-gray-400 capitalize">{STATUS_LABEL[status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
