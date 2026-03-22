"use client";

import { useState } from "react";

export function QuoteNotesEditor({
  quoteId,
  initialNotes,
}: {
  quoteId: string;
  initialNotes: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [draft, setDraft] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/app/quotes/api/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: draft }),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        throw new Error(j.error ?? "Failed to save");
      }
      setNotes(draft);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(notes);
    setEditing(false);
    setError("");
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Notes</p>
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <textarea
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Add notes for this quote — visible to you only, not the customer…"
          rows={4}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none"
        />
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 rounded-xl py-2.5 border border-gray-200 text-sm font-semibold text-gray-500">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl py-2.5 text-white font-semibold text-sm disabled:opacity-60"
            style={{ backgroundColor: "#1B3A6B" }}>
            {saving ? "Saving…" : "Save Notes"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase">Notes</p>
        <button
          onClick={() => { setDraft(notes); setEditing(true); }}
          className="flex items-center gap-1 text-xs font-semibold text-[#1B3A6B] bg-blue-50 rounded-lg px-2.5 py-1.5">
          ✏️ {notes.trim() ? "Edit" : "Add Notes"}
        </button>
      </div>
      {notes.trim() ? (
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{notes}</p>
      ) : (
        <button
          onClick={() => { setDraft(""); setEditing(true); }}
          className="text-sm text-gray-400 italic w-full text-left">
          Tap to add notes before sending…
        </button>
      )}
    </div>
  );
}
