"use client";

import { useState } from "react";
import { buildIcsContent } from "@/lib/buildIcs";

interface Props {
  jobId: string;
  jobTitle: string;
  initialDate?: string | null;
  initialAddress?: string | null;
}

function toLocalDateTimeInputs(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: "", time: "08:00" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: iso.slice(0, 10), time: "08:00" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function JobScheduleModal({ jobId, jobTitle, initialDate, initialAddress }: Props) {
  const parsed = toLocalDateTimeInputs(initialDate);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(parsed.date);
  const [startTime, setStartTime] = useState(parsed.time);
  const [endTime, setEndTime] = useState("");
  const [address, setAddress] = useState(initialAddress ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!date) { setError("Date is required"); return; }
    setSaving(true);
    setError("");
    try {
      const scheduledDate = startTime ? `${date}T${startTime}:00` : date;
      const res = await fetch(`/app/jobs/${jobId}/api/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_date: scheduledDate, end_time: endTime, address }),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        throw new Error(j.error ?? "Failed to save");
      }
      setOpen(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const hasDate = date.length === 10;
  const safeFilename = jobTitle.split("").map(c => /[a-zA-Z0-9]/.test(c) ? c : "-").join("") + ".ics";

  function downloadIcs() {
    const content = buildIcsContent(jobId, jobTitle, date, startTime, endTime, address);
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-white font-semibold text-sm shadow-sm"
        style={{ backgroundColor: "#1B3A6B" }}
      >
        📅 {initialDate ? "Reschedule Job" : "Schedule Job"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg mx-auto mt-12 mb-8 p-6 space-y-4"
            style={{ minHeight: "auto" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-slate-800">Schedule Job</p>
                <p className="text-xs text-gray-400 mt-0.5">{jobTitle}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 text-xl leading-none w-8 h-8 flex items-center justify-center">✕</button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Address</label>
                <input
                  type="text"
                  placeholder="Job site address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl py-3 text-white font-bold text-sm disabled:opacity-60"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                {saving ? "Saving…" : "Save Schedule"}
              </button>
            </form>

            {hasDate && (
              <button
                type="button"
                onClick={downloadIcs}
                className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 border border-gray-200 text-sm font-semibold text-slate-600 active:bg-gray-50"
              >
                📆 Add to Calendar (.ics)
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
