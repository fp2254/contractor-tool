"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ACTIONS = [
  { label: "New Client",  icon: "👤", href: "/app/customers?new=1" },
  { label: "New Quote",   icon: "📋", href: "/app/quotes/new" },
  { label: "New Job",     icon: "🔨", href: "/app/jobs/new" },
  { label: "New Invoice", icon: "💵", href: "/app/money" },
];

export function QuickCreate() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[55] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-t-3xl shadow-xl pt-5 pb-28 px-4">
            <p className="text-xs font-semibold text-gray-400 uppercase text-center mb-4 tracking-wider">
              Quick Create
            </p>
            <div className="grid grid-cols-2 gap-3">
              {ACTIONS.map(a => (
                <button
                  key={a.label}
                  onClick={() => {
                    setOpen(false);
                    router.push(a.href);
                  }}
                  className="flex flex-col items-center justify-center gap-2 bg-gray-50 rounded-2xl p-5 active:bg-blue-50 transition-colors border border-gray-100">
                  <span className="text-3xl">{a.icon}</span>
                  <span className="text-sm font-semibold text-slate-700">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-[4.5rem] right-4 z-[55] h-14 w-14 rounded-full text-white shadow-lg flex items-center justify-center transition-transform active:scale-95"
        style={{ backgroundColor: "#1B3A6B" }}
        aria-label="Quick Create">
        <span className="text-2xl font-light leading-none">{open ? "✕" : "+"}</span>
      </button>
    </>
  );
}
