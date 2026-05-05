"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  jobId: string;
}

export function JobReviewPanel({ jobId }: Props) {
  const router = useRouter();
  const [action, setAction] = useState<"approve" | "send_back" | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(act: "approve" | "send_back") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/app/jobs/${jobId}/api/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: act, reason: reason.trim() || undefined }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Action failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(false);
      setAction(null);
    }
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-purple-600 text-lg">🔍</span>
        <p className="text-sm font-bold text-purple-800">Awaiting Your Review</p>
      </div>
      <p className="text-xs text-purple-600">Tech has submitted this job for review. Inspect the report, field responses, and photos before approving.</p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {action === "send_back" && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase">Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Missing fan photo, re-measure required"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      )}

      <div className="flex gap-2">
        {action !== "send_back" && (
          <button
            type="button"
            onClick={() => submit("approve")}
            disabled={loading}
            className="flex-1 rounded-xl py-3 bg-green-600 text-white text-sm font-semibold disabled:opacity-60">
            {loading ? "…" : "✓ Approve Job"}
          </button>
        )}
        {action === "send_back" ? (
          <>
            <button
              type="button"
              onClick={() => submit("send_back")}
              disabled={loading}
              className="flex-1 rounded-xl py-3 bg-amber-500 text-white text-sm font-semibold disabled:opacity-60">
              {loading ? "…" : "Send Back"}
            </button>
            <button
              type="button"
              onClick={() => { setAction(null); setReason(""); }}
              className="px-4 rounded-xl border border-gray-200 text-sm text-gray-500">
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setAction("send_back")}
            disabled={loading}
            className="flex-1 rounded-xl py-3 bg-white border border-amber-300 text-amber-700 text-sm font-semibold">
            ⟲ Send Back
          </button>
        )}
      </div>
    </div>
  );
}
