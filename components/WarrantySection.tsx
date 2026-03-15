"use client";

import { useState } from "react";

export const WARRANTY_CLAUSES = [
  { id: "payment",        label: "Payment due on completion",           text: "Payment is due upon completion of work unless otherwise agreed in writing." },
  { id: "labor-warranty", label: "1-year labor warranty",               text: "All labor is warranted for 1 year from the date of completion." },
  { id: "parts-warranty", label: "90-day parts warranty",               text: "All parts and materials are warranted per manufacturer specifications (minimum 90 days)." },
  { id: "codes",          label: "Work to local code",                  text: "All work will be performed in accordance with applicable local building codes and regulations." },
  { id: "permits",        label: "Client responsible for permits",      text: "Customer is responsible for obtaining any required permits unless otherwise agreed." },
  { id: "scope",          label: "Additional work requires new agreement", text: "Any work beyond the agreed scope will require a separate written agreement and additional charges." },
  { id: "access",         label: "Site access required",                text: "Customer agrees to provide reasonable access to the work site at the scheduled time. A return trip fee may apply if access is unavailable." },
  { id: "cancellation",   label: "48-hr cancellation notice",           text: "Cancellations with less than 48 hours notice may be subject to a cancellation fee." },
] as const;

export function parseWarrantyClauses(text: string): string[] {
  return WARRANTY_CLAUSES.filter((c) => text.includes(c.text)).map((c) => c.id);
}

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
