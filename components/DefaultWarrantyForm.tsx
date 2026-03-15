"use client";

import { useState } from "react";
import { WARRANTY_CLAUSES } from "@/components/WarrantySection";

function buildText(clauseIds: Set<string>, custom: string): string {
  const clauseParts = WARRANTY_CLAUSES
    .filter((c) => clauseIds.has(c.id))
    .map((c) => c.text);
  const customTrimmed = custom.trim();
  return [...clauseParts, ...(customTrimmed ? [customTrimmed] : [])].join("\n");
}

function parseInitial(text: string): { ids: Set<string>; custom: string } {
  const ids = new Set<string>();
  let remaining = text;
  for (const clause of WARRANTY_CLAUSES) {
    if (text.includes(clause.text)) {
      ids.add(clause.id);
      remaining = remaining.replace(clause.text, "").trim();
    }
  }
  return { ids, custom: remaining };
}

export function DefaultWarrantyForm({ initialText }: { initialText: string }) {
  const { ids: initialIds, custom: initialCustom } = parseInitial(initialText);
  const [checked, setChecked] = useState<Set<string>>(initialIds);
  const [custom, setCustom] = useState(initialCustom);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    setErrorMsg("");
    const text = buildText(checked, custom);
    try {
      const res = await fetch("/api/profile/warranty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ default_warranty_text: text }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Save failed");
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Could not save — please try again");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = checked.size + (custom.trim() ? 1 : 0);

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 leading-relaxed">
        These terms will be pre-filled on every new quote. You can edit or remove them per-quote at any time.
      </p>

      {/* Clause checkboxes */}
      <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {WARRANTY_CLAUSES.map((c) => (
          <label
            key={c.id}
            className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${checked.has(c.id) ? "bg-blue-50" : "bg-white active:bg-gray-50"}`}>
            <input
              type="checkbox"
              checked={checked.has(c.id)}
              onChange={() => toggle(c.id)}
              className="mt-0.5 h-4 w-4 rounded accent-[#1B3A6B] flex-shrink-0"
            />
            <div>
              <p className="text-sm font-semibold text-slate-700">{c.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-snug">{c.text}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Custom text */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
          Additional Custom Terms
        </label>
        <textarea
          rows={4}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Add any custom warranty language, jurisdiction-specific terms, or anything else you want included on every quote…"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white resize-none"
        />
      </div>

      {/* Preview */}
      {selectedCount > 0 && (
        <details className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
          <summary className="px-4 py-2.5 text-xs font-semibold text-gray-500 cursor-pointer select-none list-none flex items-center justify-between">
            <span>Preview what will appear on quotes</span>
            <span className="text-[#1B3A6B] font-bold">
              {checked.size} clause{checked.size !== 1 ? "s" : ""}{custom.trim() ? " + custom" : ""}
            </span>
          </summary>
          <div className="px-4 pb-4 pt-2 border-t border-gray-100">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
              {buildText(checked, custom) || "Nothing selected yet."}
            </pre>
          </div>
        </details>
      )}

      {/* Feedback */}
      {status === "error" && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      {status === "success" && (
        <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700 font-semibold flex items-center gap-2">
          <span>✓</span> Default warranty saved — will pre-fill on new quotes.
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl py-3 text-white text-sm font-semibold disabled:opacity-60"
        style={{ backgroundColor: "#1B3A6B" }}>
        {saving ? "Saving…" : "Save Default Warranty"}
      </button>
    </div>
  );
}
