"use client";

import { useState } from "react";
import { WARRANTY_CLAUSES } from "@/lib/warrantyUtils";

export { WARRANTY_CLAUSES, parseWarrantyClauses } from "@/lib/warrantyUtils";

export type WarrantyClauseId = typeof WARRANTY_CLAUSES[number]["id"];

function buildText(ids: Set<string>): string {
  return WARRANTY_CLAUSES
    .filter(c => ids.has(c.id))
    .map(c => c.text)
    .join("\n");
}

export function WarrantySection({
  value,
  onChange,
  initialChecked,
}: {
  value: string;
  onChange: (text: string) => void;
  initialChecked?: string[];
}) {
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(initialChecked ?? [])
  );
  const [open, setOpen] = useState((initialChecked?.length ?? 0) > 0);

  function toggleClause(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChange(buildText(next));
      return next;
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2 w-full text-left">
        <span className={`transition-transform text-gray-400 text-xs ${open ? "rotate-90" : ""}`}>▶</span>
        Terms & Warranty Clauses
        {checked.size > 0 && (
          <span className="ml-1 text-xs font-bold text-white rounded-full px-2 py-0.5" style={{ backgroundColor: "#1B3A6B" }}>
            {checked.size}
          </span>
        )}
      </button>

      {open && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 divide-y divide-gray-100">
          {WARRANTY_CLAUSES.map(c => (
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
      )}
    </div>
  );
}
