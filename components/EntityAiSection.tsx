"use client";

import { useState } from "react";
import { AiAnswerCard } from "@/components/AiAnswerCard";

type AiRun = {
  id: string;
  feature: string;
  input_text: string | null;
  output_json: Record<string, unknown> | null;
  output_text: string | null;
  created_at: string;
};

export type AiAttachment = {
  id: string;
  title: string | null;
  note: string | null;
  is_pinned: boolean;
  created_at: string;
  ai_runs: AiRun | null;
};

const FEATURE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  permit_assistant: { label: "Permit Assistant", emoji: "📋", color: "bg-blue-100 text-blue-700" },
  job_capture:      { label: "Job Capture",       emoji: "⚡", color: "bg-purple-100 text-purple-700" },
  voice_job:        { label: "Voice Capture",    emoji: "🎙️", color: "bg-indigo-100 text-indigo-700" },
  followup_draft:   { label: "Follow-up Draft",  emoji: "✉️", color: "bg-amber-100 text-amber-700" },
};

function defaultFeatureLabel(feature: string) {
  return FEATURE_LABELS[feature] ?? { label: feature, emoji: "🤖", color: "bg-gray-100 text-gray-600" };
}

function AttachmentItem({
  attachment,
  onDelete,
  onPin,
}: {
  attachment: AiAttachment;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const run = attachment.ai_runs;
  const meta = run ? defaultFeatureLabel(run.feature) : { label: "AI Answer", emoji: "🤖", color: "bg-gray-100 text-gray-600" };

  const displayTitle =
    attachment.title ||
    (run?.feature === "permit_assistant" && run.input_text ? `Permit: ${run.input_text.slice(0, 40)}` : null) ||
    (run?.feature === "job_capture" && (run.output_json as Record<string, string> | null)?.job_title ? `Job Capture: ${(run.output_json as Record<string, string>).job_title.slice(0, 40)}` : null) ||
    meta.label;

  async function handleDelete() {
    if (!confirm("Remove this AI answer from this record?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/ai/attach/${attachment.id}`, { method: "DELETE" });
      onDelete(attachment.id);
    } finally {
      setDeleting(false);
    }
  }

  async function handlePin() {
    const newPinned = !attachment.is_pinned;
    await fetch(`/api/ai/attach/${attachment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pinned: newPinned }),
    });
    onPin(attachment.id, newPinned);
  }

  return (
    <div className={`rounded-xl border p-3 ${attachment.is_pinned ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-gray-50"}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 text-left">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-xs rounded-full px-2 py-0.5 font-semibold ${meta.color}`}>
              {meta.emoji} {meta.label}
            </span>
            {attachment.is_pinned && <span className="text-xs text-amber-600">📌</span>}
          </div>
          <p className="text-sm font-semibold text-slate-800 leading-snug">{displayTitle}</p>
          <p className="text-xs text-gray-400 mt-0.5">{new Date(attachment.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
        </button>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={handlePin}
            title={attachment.is_pinned ? "Unpin" : "Pin"}
            className="text-gray-300 hover:text-amber-500 text-base leading-none p-1">
            📌
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Remove"
            className="text-gray-300 hover:text-red-400 text-base leading-none p-1">
            ✕
          </button>
        </div>
      </div>

      {expanded && run && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          {run.input_text && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Question</p>
              <p className="text-xs text-gray-600">{run.input_text}</p>
            </div>
          )}
          <AiAnswerCard
            feature={run.feature}
            outputJson={run.output_json}
            outputText={run.output_text}
          />
          {attachment.note && (
            <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100 italic">{attachment.note}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function EntityAiSection({
  initialAttachments,
}: {
  entityType: string;
  entityId: string;
  initialAttachments: AiAttachment[];
}) {
  const [attachments, setAttachments] = useState<AiAttachment[]>(
    [...initialAttachments].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
  );

  function handleDelete(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function handlePin(id: string, pinned: boolean) {
    setAttachments((prev) =>
      [...prev.map((a) => (a.id === id ? { ...a, is_pinned: pinned } : a))]
        .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
    );
  }

  if (attachments.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Answers</p>
      {attachments.map((a) => (
        <AttachmentItem
          key={a.id}
          attachment={a}
          onDelete={handleDelete}
          onPin={handlePin}
        />
      ))}
    </div>
  );
}
