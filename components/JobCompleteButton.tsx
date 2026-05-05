"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TemplateField, FieldResponse } from "@/components/JobDetailsSection";

interface Props {
  jobId: string;
  fields: TemplateField[];
  savedResponses: FieldResponse[];
  currentPhotoCount: number;
  requiredPhotoCount: number;
  isOwnerOrAdmin: boolean;
}

export function JobCompleteButton({
  jobId,
  fields,
  savedResponses,
  currentPhotoCount,
  requiredPhotoCount,
  isOwnerOrAdmin,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const savedMap = Object.fromEntries(savedResponses.map(r => [r.field_id, r.value]));

  const photosMissing = requiredPhotoCount > 0 ? Math.max(0, requiredPhotoCount - currentPhotoCount) : 0;
  const missingFields = fields.filter(f => f.required && !savedMap[f.id]?.trim());

  const localErrors: string[] = [];
  if (photosMissing > 0) {
    localErrors.push(`${photosMissing} more photo${photosMissing > 1 ? "s" : ""} required`);
  }
  for (const f of missingFields) {
    localErrors.push(`"${f.label}" must be saved`);
  }

  const isReady = localErrors.length === 0;
  const label = isOwnerOrAdmin ? "Complete Job" : "Submit for Review";
  const sublabel = isOwnerOrAdmin
    ? "Marks this job as completed and generates a report."
    : "Submits this job for Owner/Admin approval.";

  async function handleComplete() {
    if (!isReady) return;
    setLoading(true);
    setServerErrors([]);
    try {
      const res = await fetch(`/app/jobs/${jobId}/api/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json() as { ok?: boolean; status?: string; reportId?: string; errors?: string[] };
      if (!res.ok) {
        setServerErrors(json.errors ?? ["Completion failed — please try again."]);
        return;
      }
      router.push(`/app/jobs/${jobId}/report`);
    } catch {
      setServerErrors(["Network error — please try again."]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Complete Job</p>

      {!isReady && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-1">
          <p className="text-xs font-semibold text-amber-700 mb-1">Complete the following before submitting:</p>
          {localErrors.map((e, i) => (
            <p key={i} className="text-xs text-amber-700 flex items-start gap-1">
              <span>⚠</span> {e}
            </p>
          ))}
          {missingFields.length > 0 && (
            <p className="text-xs text-amber-600 mt-1">Tip: Fill in the fields above and tap Save Job Details first.</p>
          )}
        </div>
      )}

      {isReady && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-2 flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <p className="text-xs text-green-700 font-medium">All required fields and photos are complete.</p>
        </div>
      )}

      {serverErrors.length > 0 && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 space-y-1">
          {serverErrors.map((e, i) => (
            <p key={i} className="text-xs text-red-700">✕ {e}</p>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">{sublabel}</p>

      <button
        type="button"
        onClick={handleComplete}
        disabled={!isReady || loading}
        className={`w-full rounded-xl py-3 text-white text-sm font-semibold transition-opacity ${!isReady ? "opacity-40 cursor-not-allowed" : "opacity-100"}`}
        style={{ backgroundColor: isReady ? "#16a34a" : "#9ca3af" }}>
        {loading ? "Submitting…" : `✓ ${label}`}
      </button>
    </div>
  );
}
