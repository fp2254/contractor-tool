"use client";

import { useState, useEffect } from "react";
import { WARRANTY_CLAUSES, parseWarrantyParts } from "@/lib/warrantyUtils";

export type WarrantyClauseId = typeof WARRANTY_CLAUSES[number]["id"];

function buildFullText(
  standardChecked: Set<string>,
  businessChecked: boolean,
  businessText: string,
  customText: string
): string {
  const parts: string[] = [];
  WARRANTY_CLAUSES.filter((c) => standardChecked.has(c.id)).forEach((c) => parts.push(c.text));
  if (businessChecked && businessText.trim()) parts.push(businessText.trim());
  if (customText.trim()) parts.push(customText.trim());
  return parts.join("\n");
}

export function WarrantySection({
  value,
  onChange,
  businessWarrantyText = "",
}: {
  value: string;
  onChange: (text: string) => void;
  businessWarrantyText?: string;
}) {
  const biz = businessWarrantyText.trim();

  // Parse standard clauses; always strip biz from the remainder so it doesn't appear twice
  const initParsed = (() => {
    const { ids, custom: rawCustom } = parseWarrantyParts(value);
    const custom = biz
      ? rawCustom.split(biz).join("").trim()
      : rawCustom;
    return { ids, custom };
  })();

  const [checked, setChecked] = useState<Set<string>>(() => new Set(initParsed.ids));
  const [custom, setCustom] = useState(initParsed.custom);
  const [businessChecked, setBusinessChecked] = useState(!!biz);
  const [open, setOpen] = useState(!!biz || initParsed.ids.length > 0 || !!initParsed.custom.trim());

  // Sync businessChecked if the biz prop arrives after initial mount
  useEffect(() => {
    if (biz) {
      setBusinessChecked(true);
      setOpen(true);
    }
  }, [biz]);

  function toggleClause(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChange(buildFullText(next, businessChecked, biz, custom));
      return next;
    });
  }

  function toggleBusiness() {
    setBusinessChecked((prev) => {
      const next = !prev;
      onChange(buildFullText(checked, next, biz, custom));
      return next;
    });
  }

  function handleCustomChange(text: string) {
    setCustom(text);
    onChange(buildFullText(checked, businessChecked, biz, text));
  }

  const totalSelected =
    checked.size +
    (businessChecked && biz ? 1 : 0) +
    (custom.trim() ? 1 : 0);

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
            {/* Business profile warranty — rendered as its own checkable row */}
            {biz && (
              <label className="flex items-start gap-3 px-4 py-3 cursor-pointer active:bg-blue-50" style={{ backgroundColor: "#EFF6FF" }}>
                <input
                  type="checkbox"
                  checked={businessChecked}
                  onChange={toggleBusiness}
                  className="mt-0.5 h-4 w-4 rounded accent-[#1B3A6B]"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    My Business Terms
                    <span className="text-[10px] font-bold text-[#1B3A6B] bg-blue-100 rounded px-1.5 py-0.5 leading-none">SAVED</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug line-clamp-3">{biz}</p>
                </div>
              </label>
            )}

            {/* Standard warranty clauses */}
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
              Additional Custom Terms
            </label>
            <textarea
              rows={custom.trim() ? 6 : 3}
              value={custom}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="Paste or type any extra warranty language here…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
