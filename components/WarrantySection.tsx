"use client";

import { useState } from "react";
import { WARRANTY_CLAUSES, parseWarrantyParts, buildWarrantyText } from "@/lib/warrantyUtils";

export type WarrantyClauseId = typeof WARRANTY_CLAUSES[number]["id"];

export function WarrantySection({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const { ids: initialIds, custom: initialCustom } = parseWarrantyParts(value);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(initialIds));
  const [custom, setCustom] = useState(initialCustom);
  const [open, setOpen] = useState(initialIds.length > 0 || !!initialCustom.trim());

  function toggleClause(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChange(buildWarrantyText(next, custom));
      return next;
    });
  }

  function handleCustomChange(text: string) {
    setCustom(text);
    onChange(buildWarrantyText(checked, text));
  }

  const totalSelected = checked.size + (custom.trim() ? 1 : 0);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2 w-full text-left">
        <span className={`transition-transform text-gray-400 text-xs ${open ? "rotate-90" : ""}`}>▶</span>
        Terms & Warranty Clauses
        {totalSelected > 0 && (
          <span className="ml-1 text-xs font-bold text-white rounded-full px-2 py-0.5" style={{ backgroundColor: "#1B3A6B" }}>
            {totalSelected}
          </span>
        )}
      </button>

      {open && (
        <div className="space-y-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 divide-y divide-gray-100">
            {WARRANTY_CLAUSES.map((c) => (
              <label key={c.id} className="flex items-start gap-3 px-4 py-3 cursor-pointer active:bg-blue-50">
                <input
                  type="checkbox"
                  checked={checked.has(c.id)}
                  onChange={() => toggleClause(c.id)}
                  className="mt-0.5 h-4 w-4 rounded accent-[#1B3A6B]"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">{c.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">{c.text}</p>
                </div>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Custom Terms
            </label>
            <textarea
              rows={custom.trim() ? 6 : 3}
              value={custom}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="Paste or type any custom warranty language here…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
