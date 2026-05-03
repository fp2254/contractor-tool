"use client";

import { useState } from "react";
import Link from "next/link";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  lastSignIn: string | null;
  isPlatformAdmin: boolean;
  banned: boolean;
  orgs: { orgId: string; orgName: string; role: string }[];
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function UsersClient({ rows: initialRows }: { rows: UserRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return r.email.toLowerCase().includes(s) || (r.name ?? "").toLowerCase().includes(s);
  });

  async function handleDeactivate(userId: string, currentlyBanned: boolean) {
    setLoading(userId);
    try {
      const action = currentlyBanned ? "reactivate" : "deactivate";
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        alert(json.error ?? "Action failed");
        return;
      }
      setRows((prev) =>
        prev.map((r) => r.id === userId ? { ...r, banned: !currentlyBanned } : r)
      );
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(userId: string) {
    setLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        alert(json.error ?? "Delete failed");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== userId));
      setExpanded(null);
    } finally {
      setLoading(null);
      setConfirmDelete(null);
    }
  }

  return (
    <div className="space-y-3">
      <input placeholder="Search by email or name…" value={q} onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none" />
      <p className="text-xs text-gray-400">{filtered.length} of {rows.length} users</p>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 p-6 text-center">No users match your search.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((u) => (
              <div key={u.id}>
                <div
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(expanded === u.id ? null : u.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold truncate ${u.banned ? "text-gray-400 line-through" : "text-slate-800"}`}>
                        {u.email}
                      </p>
                      {u.isPlatformAdmin && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-bold">ADMIN</span>
                      )}
                      {u.banned && (
                        <span className="text-[10px] bg-red-100 text-red-600 rounded-full px-2 py-0.5 font-bold">DEACTIVATED</span>
                      )}
                    </div>
                    {u.name && <p className="text-xs text-gray-500">{u.name}</p>}
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Joined {fmtDate(u.createdAt)} · Last sign-in {fmtDate(u.lastSignIn)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-300">{expanded === u.id ? "▲" : "▼"}</span>
                </div>

                {expanded === u.id && (
                  <div className="px-4 pb-4 bg-gray-50 space-y-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">ID: {u.id}</p>

                    {u.orgs.length === 0 ? (
                      <p className="text-xs text-gray-400">No orgs</p>
                    ) : (
                      <div className="space-y-1">
                        {u.orgs.map((o) => (
                          <div key={o.orgId} className="flex items-center gap-2">
                            <Link href={`/app/admin/memberships/${o.orgId}`}
                              className="text-xs text-[#1B3A6B] font-semibold underline">{o.orgName}</Link>
                            <span className="text-[10px] text-gray-400">({o.role})</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions — never apply to platform admins */}
                    {!u.isPlatformAdmin && (
                      <div className="flex gap-2 pt-1">
                        <button
                          disabled={loading === u.id}
                          onClick={() => handleDeactivate(u.id, u.banned)}
                          className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                            u.banned
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                          {loading === u.id ? "…" : u.banned ? "Reactivate" : "Deactivate"}
                        </button>

                        {confirmDelete === u.id ? (
                          <div className="flex gap-2 flex-1">
                            <button
                              disabled={loading === u.id}
                              onClick={() => handleDelete(u.id)}
                              className="flex-1 rounded-xl py-2 text-sm font-semibold bg-red-600 text-white disabled:opacity-50">
                              {loading === u.id ? "Removing…" : "Confirm Remove"}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="rounded-xl px-3 py-2 text-sm font-semibold bg-white border border-gray-200 text-gray-600">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(u.id)}
                            className="flex-1 rounded-xl py-2 text-sm font-semibold bg-red-50 text-red-600 border border-red-200">
                            Remove
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
