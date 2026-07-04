"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ALL_SIDEBAR_ITEMS,
  DEFAULT_SIDEBAR_IDS,
  SIDEBAR_STORAGE_KEY,
  SIDEBAR_UPDATED_EVENT,
  MIN_SIDEBAR_ITEMS,
  MAX_SIDEBAR_ITEMS,
} from "@/lib/sidebarNav";

export default function SidebarCustomizerClient() {
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_SIDEBAR_IDS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) setSelectedIds(parsed);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  function persist(next: string[]) {
    setSelectedIds(next);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(SIDEBAR_UPDATED_EVENT));
    } catch { /* ignore */ }
  }

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      if (selectedIds.length <= MIN_SIDEBAR_ITEMS) return;
      persist(selectedIds.filter((x) => x !== id));
    } else {
      if (selectedIds.length >= MAX_SIDEBAR_ITEMS) return;
      persist([...selectedIds, id]);
    }
  }

  function resetDefault() {
    persist(DEFAULT_SIDEBAR_IDS);
  }

  return (
    <div className="p-4 lg:p-8 lg:max-w-2xl">
      <Link href="/app/more" className="text-sm font-semibold text-blue-600">‹ More</Link>

      <h1 className="text-xl font-bold text-slate-800 mt-2 mb-1">Customize Sidebar</h1>
      <p className="text-sm text-gray-400 mb-4">
        Choose which sections show in your desktop sidebar (visible on wide screens). Pick between {MIN_SIDEBAR_ITEMS} and {MAX_SIDEBAR_ITEMS} items.
        Your phone/tablet bottom navigation is not affected.
      </p>

      <div className="space-y-2">
        {ALL_SIDEBAR_ITEMS.map((item) => {
          const checked = selectedIds.includes(item.id);
          const disabledAdd = !checked && selectedIds.length >= MAX_SIDEBAR_ITEMS;
          const disabledRemove = checked && selectedIds.length <= MIN_SIDEBAR_ITEMS;
          const disabled = loaded && (disabledAdd || disabledRemove);

          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(item.id)}
              className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-sm text-left transition-colors ${
                checked ? "bg-blue-50 ring-1 ring-[#1B3A6B]" : "bg-white"
              } ${disabled ? "opacity-40" : ""}`}
            >
              <span className="h-9 w-9 rounded-full flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: "#1B3A6B18" }}>
                {item.icon}
              </span>
              <span className="flex-1 text-[13px] font-semibold text-slate-700">{item.label}</span>
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  checked ? "border-[#1B3A6B] bg-[#1B3A6B]" : "border-gray-300"
                }`}
              >
                {checked && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={resetDefault}
        className="mt-4 text-xs font-semibold text-gray-400 hover:text-gray-600"
      >
        Reset to default
      </button>
    </div>
  );
}
