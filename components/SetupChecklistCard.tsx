"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export type ChecklistStep = {
  id: string;
  label: string;
  done: boolean;
  href: string;
  storageKey?: string;
};

const DISMISSED_KEY = "tb_setup_dismissed";
const COLLAPSED_KEY = "tb_setup_collapsed";

export default function SetupChecklistCard({ steps }: { steps: ChecklistStep[] }) {
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [storageOverrides, setStorageOverrides] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "true");
    const overrides: Record<string, boolean> = {};
    steps.forEach((s) => {
      if (s.storageKey) {
        overrides[s.id] = localStorage.getItem(s.storageKey) === "true";
      }
    });
    setStorageOverrides(overrides);
    setMounted(true);
  }, [steps]);

  if (!mounted || dismissed) return null;

  const resolved = steps.map((s) => ({
    ...s,
    done: s.done || !!storageOverrides[s.id],
  }));

  const doneCount = resolved.filter((s) => s.done).length;
  const total = resolved.length;
  const allDone = doneCount === total;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  }

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, String(next));
  }

  if (allDone) {
    return (
      <div className="bg-white rounded-2xl shadow-sm px-4 py-4 flex items-center gap-3">
        <span className="text-2xl">🎉</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-800">Setup complete!</p>
          <p className="text-xs text-gray-400">You're all set to run your business.</p>
        </div>
        <button onClick={dismiss} className="text-xs text-gray-400 underline shrink-0">
          Got it
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={toggleCollapse}
        className="w-full flex items-center gap-3 px-4 py-3"
      >
        <span className="text-base">🚀</span>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-slate-800">Get set up</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(doneCount / total) * 100}%`,
                  backgroundColor: "#1B3A6B",
                }}
              />
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {doneCount}/{total}
            </span>
          </div>
        </div>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="border-t border-gray-100">
          <div className="divide-y divide-gray-50">
            {resolved.map((step) => (
              <Link
                key={step.id}
                href={step.href}
                className="flex items-center gap-3 px-4 py-2.5 active:bg-gray-50"
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    step.done
                      ? "bg-green-500"
                      : "border-2 border-gray-200"
                  }`}
                >
                  {step.done && (
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="white" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span
                  className={`flex-1 text-sm ${
                    step.done ? "line-through text-gray-400" : "text-slate-700"
                  }`}
                >
                  {step.label}
                </span>
                {!step.done && (
                  <span className="text-gray-300 text-xs">›</span>
                )}
              </Link>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Tap any step to get started
            </p>
            <button onClick={dismiss} className="text-xs text-gray-400 underline">
              Dismiss for now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
