"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Job = {
  id: string;
  job_title: string;
  status: string;
  scheduled_date: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  customer_id: string;
  customer_name: string;
};

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  submitted_for_review: "bg-purple-100 text-purple-700",
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  submitted_for_review: "In Review",
};

type Tab = "All" | "Today" | "Scheduled" | "In Progress" | "Completed";
const TABS: Tab[] = ["All", "Today", "Scheduled", "In Progress", "Completed"];

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function JobsClient({ jobs }: { jobs: Job[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("All");

  const today = new Date().toISOString().slice(0, 10);

  const counts: Record<Tab, number> = useMemo(() => ({
    All: jobs.length,
    Today: jobs.filter(j => j.scheduled_date === today).length,
    Scheduled: jobs.filter(j => j.status === "scheduled").length,
    "In Progress": jobs.filter(j => j.status === "in_progress").length,
    Completed: jobs.filter(j => j.status === "completed").length,
  }), [jobs, today]);

  const filtered = useMemo(() => {
    switch (activeTab) {
      case "Today":       return jobs.filter(j => j.scheduled_date === today);
      case "Scheduled":   return jobs.filter(j => j.status === "scheduled");
      case "In Progress": return jobs.filter(j => j.status === "in_progress");
      case "Completed":   return jobs.filter(j => j.status === "completed");
      default:            return jobs;
    }
  }, [jobs, activeTab, today]);

  return (
    <>
      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {TABS.map((tab) => {
          const count = counts[tab];
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive ? "text-white" : "bg-white text-gray-600 border border-gray-100"
              }`}
              style={isActive ? { backgroundColor: "#1B3A6B" } : {}}>
              {tab}{count > 0 ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* Add Job button */}
      <Link
        href="/app/jobs/new"
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white font-semibold"
        style={{ backgroundColor: "#1B3A6B" }}>
        <span className="text-lg leading-none">+</span> Add Job
      </Link>

      {/* Job list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
            {activeTab === "All" ? "No jobs yet." : `No ${activeTab.toLowerCase()} jobs.`}
          </div>
        )}
        {filtered.map((job) => (
          <Link key={job.id} href={`/app/jobs/${job.id}`} className="block bg-white rounded-2xl p-4 shadow-sm active:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between mb-1 gap-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">{job.customer_name}</p>
                <p className="text-sm text-gray-600 truncate">{job.job_title}</p>
                {job.address && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    📍 {[job.address, job.city, job.state].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
              <span className={`text-xs rounded-full px-2 py-1 font-medium shrink-0 ${STATUS_BADGE[job.status] ?? "bg-gray-100 text-gray-600"}`}>
                {STATUS_LABEL[job.status] ?? job.status}
              </span>
            </div>
            {job.scheduled_date && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500 flex items-center gap-1">📅 {formatDate(job.scheduled_date)}</span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </>
  );
}
