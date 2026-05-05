"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  jobId: string;
  currentTemplateId: string | null;
  currentTemplateName: string | null;
  templates: { id: string; name: string }[];
}

export function JobTemplateAssigner({ jobId, currentTemplateId, currentTemplateName, templates }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentTemplateId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedName = templates.find(t => t.id === selected)?.name ?? null;
  const hasChange = selected !== (currentTemplateId ?? "");
  const isSwitching = currentTemplateId && selected && selected !== currentTemplateId;

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/app/jobs/${jobId}/api/template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: selected || null }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Job Template</p>
          <p className={`text-sm mt-0.5 ${currentTemplateName ? "font-medium text-slate-800" : "text-gray-400"}`}>
            {currentTemplateName ?? "None assigned"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setOpen(v => !v); setSelected(currentTemplateId ?? ""); setError(""); }}
          className="text-xs font-semibold text-[#1B3A6B] border border-[#1B3A6B] rounded-lg px-3 py-1.5">
          {open ? "Cancel" : currentTemplateId ? "Change" : "Assign"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          {templates.length === 0 ? (
            <p className="text-sm text-gray-400">No active templates found. Create one in Templates first.</p>
          ) : (
            <>
              <select
                value={selected}
                onChange={e => setSelected(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">— No template —</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>

              {isSwitching && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                  <p className="text-xs text-amber-700 font-medium">⚠ Switching templates</p>
                  <p className="text-xs text-amber-600 mt-0.5">Previously saved field responses for the old template will remain in the database but won't be displayed. New fields will start blank.</p>
                </div>
              )}

              {selected && (
                <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">
                  <p className="text-xs text-[#1B3A6B] font-medium">Template: {selectedName}</p>
                  <p className="text-xs text-blue-500 mt-0.5">Fields, photo requirements, warranty, and invoice items from this template will be used.</p>
                </div>
              )}

              {error && <p className="text-xs text-red-600">{error}</p>}

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !hasChange}
                className="w-full rounded-xl py-2.5 text-white text-sm font-semibold disabled:opacity-40"
                style={{ backgroundColor: "#1B3A6B" }}>
                {saving ? "Saving…" : selected ? `Assign "${selectedName}"` : "Remove Template"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
