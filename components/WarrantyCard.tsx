"use client";

import { useState } from "react";

const DEFAULT_WARRANTY =
  "All work performed is warranted for 1 year against defects in materials and workmanship. Warranty does not cover damage caused by misuse, neglect, or acts of nature. Contact us if you have any warranty concerns.";

interface WarrantyCardProps {
  initialText: string | null;
  saveWarranty: (text: string | null) => Promise<void>;
}

export function WarrantyCard({ initialText, saveWarranty }: WarrantyCardProps) {
  const [enabled, setEnabled] = useState(initialText !== null);
  const [text, setText] = useState(initialText ?? DEFAULT_WARRANTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleToggle = async (on: boolean) => {
    setEnabled(on);
    setSaving(true);
    setSaved(false);
    try {
      await saveWarranty(on ? text : null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!enabled) return;
    setSaving(true);
    setSaved(false);
    try {
      await saveWarranty(text);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase">Warranty</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-slate-600 font-medium">
            {enabled ? "Included" : "Not included"}
          </span>
          <div
            onClick={() => handleToggle(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? "bg-[#1B3A6B]" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </div>
        </label>
      </div>

      {enabled && (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 resize-none"
            placeholder="Enter warranty terms…"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl py-2.5 text-white text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: "#1B3A6B" }}
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Warranty"}
          </button>
        </div>
      )}

      {!enabled && (
        <p className="text-sm text-gray-400">
          Toggle on to add warranty terms to this document.
        </p>
      )}
    </div>
  );
}
