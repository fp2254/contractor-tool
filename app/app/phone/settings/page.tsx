"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const ROUTING_MODES = [
  {
    id: "contractor_first",
    icon: "👤",
    label: "Contractor First",
    desc: "Rings your phone first. If you don't answer, the AI takes over.",
  },
  {
    id: "ai_first",
    icon: "🤖",
    label: "AI First",
    desc: "AI always answers every call. Great for after-hours or busy days.",
  },
  {
    id: "simultaneous",
    icon: "⚡",
    label: "Simultaneous Ring",
    desc: "Your phone and the AI ring at the same time. Whoever picks up first wins.",
  },
  {
    id: "ai_fallback",
    icon: "🔀",
    label: "AI Fallback",
    desc: "Same as Contractor First. AI catches any call you miss.",
  },
];

const TIMEOUT_OPTIONS = [15, 20, 30, 45];

export default function PhoneSettingsPage() {
  const [settings, setSettings] = useState({
    routing_mode: "ai_fallback",
    contractor_forward_number: "",
    ring_timeout_seconds: 20,
    record_calls: true,
    missed_call_sms_enabled: true,
    missed_call_sms_template:
      "Hi! You just called {business_name}. We missed you — we'll call you back shortly. Thanks!",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    fetch("/api/phone/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings((p) => ({ ...p, ...d.settings }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/phone/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="p-4">
      <div className="h-8 bg-gray-100 rounded-xl animate-pulse mb-4" />
      <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
    </div>
  );

  const needsForwardNumber = settings.routing_mode !== "ai_first";

  return (
    <div className="p-4 pb-28 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/app/phone" className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-slate-800">Phone Settings</h1>
      </div>

      {/* Routing mode */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Call Routing</p>
        </div>
        <div className="p-4 space-y-2">
          {ROUTING_MODES.map((mode) => (
            <button key={mode.id} onClick={() => setSettings((p) => ({ ...p, routing_mode: mode.id }))}
              className={`w-full flex items-start gap-3 p-3 rounded-2xl border-2 text-left transition-colors ${
                settings.routing_mode === mode.id
                  ? "border-[#1B3A6B] bg-blue-50"
                  : "border-gray-100 bg-gray-50"
              }`}>
              <span className="text-2xl flex-shrink-0 mt-0.5">{mode.icon}</span>
              <div>
                <p className={`text-sm font-semibold ${settings.routing_mode === mode.id ? "text-[#1B3A6B]" : "text-slate-700"}`}>{mode.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{mode.desc}</p>
              </div>
              {settings.routing_mode === mode.id && (
                <span className="ml-auto text-[#1B3A6B] flex-shrink-0">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Forwarding number */}
      {needsForwardNumber && (
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">Your Phone Number (for forwarding)</label>
          <input
            type="tel"
            placeholder="+15035550199"
            value={settings.contractor_forward_number}
            onChange={(e) => setSettings((p) => ({ ...p, contractor_forward_number: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <p className="text-xs text-gray-400">Include country code. E.g. +1 for US numbers.</p>
        </div>
      )}

      {/* Ring timeout */}
      {(settings.routing_mode === "contractor_first" || settings.routing_mode === "ai_fallback") && (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">Ring Timeout Before AI Picks Up</label>
          <div className="grid grid-cols-4 gap-2">
            {TIMEOUT_OPTIONS.map((s) => (
              <button key={s} onClick={() => setSettings((p) => ({ ...p, ring_timeout_seconds: s }))}
                className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                  settings.ring_timeout_seconds === s
                    ? "border-[#1B3A6B] bg-blue-50 text-[#1B3A6B]"
                    : "border-gray-100 text-gray-500"
                }`}>
                {s}s
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Record calls */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recording & SMS</p>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-slate-700">Record calls</p>
              <p className="text-xs text-gray-400 mt-0.5">Saves audio you can replay from the call log</p>
            </div>
            <button onClick={() => setSettings((p) => ({ ...p, record_calls: !p.record_calls }))}
              className={`relative h-6 w-11 rounded-full transition-colors ${settings.record_calls ? "bg-[#1B3A6B]" : "bg-gray-200"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${settings.record_calls ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-slate-700">Missed-call SMS</p>
              <p className="text-xs text-gray-400 mt-0.5">Auto-text callers you don't pick up</p>
            </div>
            <button onClick={() => setSettings((p) => ({ ...p, missed_call_sms_enabled: !p.missed_call_sms_enabled }))}
              className={`relative h-6 w-11 rounded-full transition-colors ${settings.missed_call_sms_enabled ? "bg-[#1B3A6B]" : "bg-gray-200"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${settings.missed_call_sms_enabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        {settings.missed_call_sms_enabled && (
          <div className="px-4 pb-4">
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">SMS Message</label>
            <textarea
              rows={3}
              value={settings.missed_call_sms_template}
              onChange={(e) => setSettings((p) => ({ ...p, missed_call_sms_template: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">Use <code className="bg-gray-100 rounded px-1">{"{business_name}"}</code> to insert your company name.</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-20 left-0 right-0 px-4">
        <button onClick={save} disabled={saving}
          className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-60 shadow-lg"
          style={{ backgroundColor: "#1B3A6B" }}>
          {saving ? "Saving…" : status === "saved" ? "✓ Saved" : "Save Settings"}
        </button>
        {status === "error" && <p className="text-xs text-red-500 text-center mt-2">Something went wrong — try again.</p>}
      </div>
    </div>
  );
}
