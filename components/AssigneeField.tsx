"use client";

import { useState } from "react";

type Member = { userId: string; name: string };

export function AssigneeField({
  entityType,
  entityId,
  currentAssigneeId,
  currentAssigneeName,
  members,
}: {
  entityType: "job" | "quote" | "invoice";
  entityId: string;
  currentAssigneeId: string | null;
  currentAssigneeName: string | null;
  members: Member[];
}) {
  const [assigneeId, setAssigneeId] = useState(currentAssigneeId ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleChange(newId: string) {
    setAssigneeId(newId);
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/team/assign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, assignedTo: newId || null }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase">Assigned To</p>
        {saving && <span className="text-xs text-gray-400">Saving…</span>}
        {saved && !saving && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
      </div>
      <select
        value={assigneeId}
        onChange={e => handleChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100">
        <option value="">Unassigned</option>
        {members.map(m => (
          <option key={m.userId} value={m.userId}>{m.name}</option>
        ))}
      </select>
      {!assigneeId && (
        <p className="text-xs text-gray-400 mt-1.5">Assign a team member to this {entityType}.</p>
      )}
    </div>
  );
}
