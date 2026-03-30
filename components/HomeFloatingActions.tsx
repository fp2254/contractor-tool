"use client";

import { useState } from "react";
import Link from "next/link";
import { PermitAssistant } from "@/components/PermitAssistant";

const MENU_ACTIONS = [
  { label: "New Quote", href: "/app/quotes/new", icon: "📋" },
  { label: "Add Lead", href: "/app/leads", icon: "👤" },
  { label: "Collect Payment", href: "/app/invoices", icon: "💰" },
  { label: "Schedule Job", href: "/app/jobs", icon: "📅" },
  { label: "New Customer", href: "/app/customers", icon: "🧑" },
  { label: "New Invoice", href: "/app/invoices", icon: "🧾" },
];

export function HomeFloatingActions() {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.18)" }}
          onClick={close}
        />
      )}

      {open && (
        <div
          className="fixed z-50 bg-white rounded-2xl shadow-2xl overflow-hidden"
          style={{ bottom: 88, right: 16, width: 220 }}
        >
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1.5">
            All Actions
          </p>
          {MENU_ACTIONS.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              onClick={close}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 active:bg-gray-50 transition-colors"
            >
              <span className="text-base w-5 text-center">{a.icon}</span>
              {a.label}
            </Link>
          ))}
          <div className="border-t border-gray-100 px-3 py-3">
            <PermitAssistant />
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed z-50 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center active:opacity-80 transition-all"
        style={{
          bottom: 88,
          right: 16,
          backgroundColor: "#1B3A6B",
          fontSize: open ? 22 : 28,
          fontWeight: 300,
          ...(open ? { transform: "rotate(45deg)" } : {}),
        }}
        aria-label={open ? "Close menu" : "Open actions"}
      >
        +
      </button>
    </>
  );
}
