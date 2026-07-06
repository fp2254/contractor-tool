"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Member = { userId: string; name: string };

export function InlineAssignSelect({
  entityType,
  entityId,
  currentAssigneeId,
  members,
  placeholder = "Assign…",
}: {
  entityType: "job" | "quote" | "invoice";
  entityId: string;
  currentAssigneeId: string | null;
  members: Member[];
  placeholder?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentAssigneeId ?? "");
  const [saving, setSaving] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newId = e.target.value;
    setValue(newId);
    setSaving(true);
    try {
      await fetch("/api/team/assign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, assignedTo: newId || null }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      onClick={e => e.stopPropagation()}
      disabled={saving}
      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50 shrink-0">
      <option value="">{placeholder}</option>
      {members.map(m => (
        <option key={m.userId} value={m.userId}>{m.name}</option>
      ))}
    </select>
  );
}
