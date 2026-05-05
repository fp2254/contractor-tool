"use client";

import { useState, useCallback } from "react";

export type TemplateField = {
  id: string;
  label: string;
  field_type: "short_text" | "dropdown" | "yes_no";
  required: boolean;
  sort_order: number;
  options: string[] | null;
};

export type FieldResponse = {
  field_id: string;
  value: string;
};

interface Props {
  jobId: string;
  templateId: string;
  templateName: string;
  requiredPhotoCount: number;
  currentPhotoCount: number;
  fields: TemplateField[];
  initialResponses: FieldResponse[];
}

export function JobDetailsSection({
  jobId,
  templateId,
  templateName,
  requiredPhotoCount,
  currentPhotoCount,
  fields,
  initialResponses,
}: Props) {
  const initMap = Object.fromEntries(initialResponses.map(r => [r.field_id, r.value]));
  const [values, setValues] = useState<Record<string, string>>(initMap);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const setValue = useCallback((fieldId: string, value: string) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    setSaved(false);
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/app/jobs/${jobId}/api/field-responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: templateId,
          responses: Object.entries(values).map(([field_id, value]) => ({ field_id, value })),
        }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const missingRequired = fields.filter(f => f.required && !values[f.id]?.trim());
  const hasRequiredPhotos = requiredPhotoCount > 0;
  const photosMet = currentPhotoCount >= requiredPhotoCount;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Job Details</p>
        <span className="text-xs text-gray-400">{templateName}</span>
      </div>

      {hasRequiredPhotos && (
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${photosMet ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
          <span>{photosMet ? "✅" : "📷"}</span>
          <span>Photos: {currentPhotoCount} / {requiredPhotoCount} required</span>
        </div>
      )}

      {fields.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-2">No fields defined for this template.</p>
      )}

      <div className="space-y-3">
        {fields.map(field => (
          <div key={field.id}>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </label>

            {field.field_type === "short_text" && (
              <input
                type="text"
                value={values[field.id] ?? ""}
                onChange={e => setValue(field.id, e.target.value)}
                placeholder={field.label}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            )}

            {field.field_type === "yes_no" && (
              <div className="flex gap-2">
                {["Yes", "No"].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setValue(field.id, opt)}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-semibold border transition-colors ${
                      values[field.id] === opt
                        ? opt === "Yes"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-red-100 text-red-700 border-red-200"
                        : "bg-white text-gray-500 border-gray-200"
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {field.field_type === "dropdown" && (
              <select
                value={values[field.id] ?? ""}
                onChange={e => setValue(field.id, e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">Select…</option>
                {(field.options ?? []).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      {fields.length > 0 && (
        <>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          {missingRequired.length > 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              ⚠ {missingRequired.length} required field{missingRequired.length > 1 ? "s" : ""} still incomplete
            </p>
          )}
          {saved && (
            <p className="text-xs text-green-600 font-medium">✓ Job details saved</p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl py-3 text-white text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: "#1B3A6B" }}>
            {saving ? "Saving…" : "Save Job Details"}
          </button>
        </>
      )}
    </div>
  );
}
