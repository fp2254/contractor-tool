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
  orgs: { orgId: string; orgName: string; role: string }[];
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function UsersClient({ rows }: { rows: UserRow[] }) {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return r.email.toLowerCase().includes(s) || (r.name ?? "").toLowerCase().includes(s);
  });

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
                      <p className="text-sm font-semibold text-slate-800 truncate">{u.email}</p>
                      {u.isPlatformAdmin && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-bold">ADMIN</span>
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
                  <div className="px-4 pb-3 bg-gray-50 space-y-2">
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
