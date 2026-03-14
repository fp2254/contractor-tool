"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ALL_ACTIONS = [
  { id: "new-client",    label: "New Client",        icon: "👤", href: "/app/customers?new=1" },
  { id: "new-quote",     label: "New Quote",          icon: "📋", href: "/app/quotes/new" },
  { id: "new-job",       label: "New Job",            icon: "🔨", href: "/app/jobs/new" },
  { id: "new-invoice",   label: "New Invoice",        icon: "💵", href: "/app/money" },
  { id: "new-lead",      label: "New Lead",           icon: "📥", href: "/app/leads?new=1" },
  { id: "ai-capture",   label: "AI Job Capture",      icon: "🤖", href: "/app?modal=ai-capture" },
  { id: "scan-receipt",  label: "Scan Receipt",       icon: "🧾", href: "/app/receipts" },
  { id: "scan-card",     label: "Scan Business Card", icon: "💳", href: "/app/trade-contacts?scan=1" },
  { id: "new-payment",   label: "Log Payment",        icon: "💰", href: "/app/money?tab=payments" },
  { id: "schedule",      label: "Schedule",           icon: "📅", href: "/app/schedule" },
  { id: "inventory",     label: "Inventory",          icon: "📦", href: "/app/inventory" },
];

const DEFAULT_IDS = ["new-client", "new-quote", "new-job", "new-invoice"];
const MAX = 6;
const STORAGE_KEY = "tb_quick_create_actions";

export function QuickCreate() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_IDS);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) setSelectedIds(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  function saveIds(ids: string[]) {
    setSelectedIds(ids);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  }

  function toggleAction(id: string) {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX) return prev;
      return [...prev, id];
    });
  }

  function handleDone() {
    saveIds(selectedIds);
    setEditing(false);
  }

  const activeActions = ALL_ACTIONS.filter(a => selectedIds.includes(a.id));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[55] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => { saveIds(selectedIds); setOpen(false); setEditing(false); }} />
          <div className="relative bg-white rounded-t-3xl shadow-xl pt-5 pb-28 px-4">

            {!editing ? (
              <>
                <div className="flex items-center justify-between mb-4 px-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Create</p>
                  <button
                    onClick={() => setEditing(true)}
                    className="text-xs font-semibold text-[#1B3A6B] bg-blue-50 rounded-lg px-3 py-1.5">
                    ✏️ Customize
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {activeActions.map(a => (
                    <button
                      key={a.id}
                      onClick={() => { setOpen(false); router.push(a.href); }}
                      className="flex flex-col items-center justify-center gap-2 bg-gray-50 rounded-2xl p-5 active:bg-blue-50 transition-colors border border-gray-100">
                      <span className="text-3xl">{a.icon}</span>
                      <span className="text-sm font-semibold text-slate-700">{a.label}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1 px-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Customize Actions</p>
                  <button
                    onClick={handleDone}
                    className="text-xs font-semibold text-white rounded-lg px-3 py-1.5"
                    style={{ backgroundColor: "#1B3A6B" }}>
                    Done
                  </button>
                </div>
                <p className="text-xs text-gray-400 px-1 mb-4">
                  Select up to {MAX} actions. {selectedIds.length}/{MAX} chosen.
                </p>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {ALL_ACTIONS.map(a => {
                    const checked = selectedIds.includes(a.id);
                    const disabled = !checked && selectedIds.length >= MAX;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleAction(a.id)}
                        className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors text-left ${
                          checked
                            ? "border-[#1B3A6B] bg-blue-50"
                            : disabled
                            ? "border-gray-100 bg-gray-50 opacity-40"
                            : "border-gray-200 bg-white"
                        }`}>
                        <span className="text-xl">{a.icon}</span>
                        <span className="flex-1 text-sm font-semibold text-slate-700">{a.label}</span>
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          checked ? "border-[#1B3A6B] bg-[#1B3A6B]" : "border-gray-300"
                        }`}>
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
              </>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => {
          if (open) { saveIds(selectedIds); setEditing(false); }
          setOpen(v => !v);
        }}
        className="fixed bottom-[4.5rem] right-4 z-[55] h-14 w-14 rounded-full text-white shadow-lg flex items-center justify-center transition-transform active:scale-95"
        style={{ backgroundColor: "#1B3A6B" }}
        aria-label="Quick Create">
        <span className="text-2xl font-light leading-none">{open ? "✕" : "+"}</span>
      </button>
    </>
  );
}
