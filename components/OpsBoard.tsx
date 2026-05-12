"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { OpsTask, OpsCategory, OpsResponse } from "@/app/app/ops/api/route";

function ProgressBar({ categories }: { categories: OpsCategory[] }) {
  const cleared = categories.filter((c) => c.cleared).length;
  const total = categories.length;
  const pct = total === 0 ? 0 : Math.round((cleared / total) * 100);

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500">Daily Progress</span>
        <span className="text-xs font-semibold text-[#1B3A6B]">
          {cleared === total ? "All clear" : `${cleared} of ${total} cleared`}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            backgroundColor: pct === 100 ? "#16A34A" : "#1B3A6B",
          }}
        />
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: OpsTask }) {
  return (
    <Link
      href={task.href}
      className="flex items-start gap-3 px-4 py-3 active:bg-gray-50 transition-colors">
      <span className="text-base mt-0.5 shrink-0">{task.icon}</span>
      <span className="flex-1 text-sm text-slate-700 leading-snug">{task.text}</span>
      <span className="text-gray-300 text-base shrink-0 mt-0.5">›</span>
    </Link>
  );
}

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="h-5 w-28 bg-gray-100 rounded animate-pulse" />
        <div className="mt-2 h-3 w-56 bg-gray-100 rounded animate-pulse" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <div className="h-5 w-5 rounded bg-gray-100 animate-pulse shrink-0" />
          <div className="h-3 flex-1 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function OpsBoard() {
  const [data, setData] = useState<OpsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch("/app/ops/api")
      .then((r) => r.json())
      .then((d) => setData(d as OpsResponse))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (!data) return null;

  const { tasks, categories, totalTasks } = data;
  const visibleTasks = showAll ? tasks : tasks.slice(0, 5);
  const allClear = totalTasks === 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className={`px-4 pt-3 ${collapsed ? "pb-3" : "pb-2 border-b border-gray-100"}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Today&apos;s Ops</h2>
          <div className="flex items-center gap-2">
            {allClear ? (
              <span className="text-xs font-semibold text-green-600 bg-green-50 rounded-full px-2 py-0.5">
                All clear
              </span>
            ) : (
              <span className="text-xs font-semibold text-[#1B3A6B] bg-blue-50 rounded-full px-2 py-0.5">
                {totalTasks} task{totalTasks !== 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 active:bg-gray-100 transition-colors"
              aria-label={collapsed ? "Expand" : "Collapse"}
            >
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "-rotate-90" : "rotate-0"}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {!collapsed && <ProgressBar categories={categories} />}
      </div>

      {!collapsed && (
        <>
          {allClear ? (
            <div className="px-4 py-2.5 flex items-center gap-2.5">
              <span className="text-base shrink-0">✅</span>
              <p className="text-sm font-semibold text-slate-700">
                Everything&apos;s on track today
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {visibleTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>

              {totalTasks > 5 && (
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="w-full px-4 py-3 text-sm font-semibold text-[#1B3A6B] text-center border-t border-gray-100 active:bg-gray-50">
                  {showAll ? "Show less" : `View all ${totalTasks} tasks`}
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
