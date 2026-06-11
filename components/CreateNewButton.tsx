"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const OPTIONS = [
  { label: "New Quote",    href: "/app/quotes/new",    emoji: "📋", color: "#2563EB" },
  { label: "New Lead",     href: "/app/leads/new",     emoji: "🎯", color: "#F97316" },
  { label: "New Job",      href: "/app/jobs/new",      emoji: "🔧", color: "#1B3A6B" },
  { label: "New Invoice",  href: "/app/invoices/new",  emoji: "💵", color: "#16A34A" },
  { label: "New Customer", href: "/app/customers/new", emoji: "👤", color: "#8B5CF6" },
];

export function CreateNewButton() {
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onTap(e: MouseEvent | TouchEvent) {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onTap);
    document.addEventListener("touchstart", onTap);
    return () => {
      document.removeEventListener("mousedown", onTap);
      document.removeEventListener("touchstart", onTap);
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm shrink-0 mt-0.5 active:opacity-80"
        style={{ backgroundColor: "#2563EB" }}
      >
        <span className="text-base leading-none font-bold">+</span> Create New
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div
            ref={sheetRef}
            className="w-full bg-white rounded-t-3xl px-4 pt-4 pb-8 shadow-2xl"
            style={{ animation: "slideUp 0.2s ease-out" }}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            <h2 className="text-base font-bold text-slate-800 mb-4 text-center">What do you want to create?</h2>

            <div className="space-y-2">
              {OPTIONS.map(({ label, href, emoji, color }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl active:opacity-70 transition-opacity"
                  style={{ backgroundColor: color + "12" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: color + "22" }}
                  >
                    {emoji}
                  </div>
                  <span className="text-sm font-semibold" style={{ color }}>
                    {label}
                  </span>
                  <span className="ml-auto text-gray-300 text-sm">›</span>
                </Link>
              ))}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full py-3 rounded-2xl text-sm font-semibold text-gray-500 bg-gray-100 active:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
