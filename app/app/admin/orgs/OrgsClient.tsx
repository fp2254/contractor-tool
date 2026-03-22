"use client";

import { useState } from "react";
import Link from "next/link";

type OrgRow = {
  id: string;
  name: string;
  isDemo: boolean;
  createdAt: string;
  ownerEmail: string | null;
  userCount: number;
  membership: { plan: string; status: string } | null;
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700", trialing: "bg-blue-100 text-blue-700",
  comped: "bg-purple-100 text-purple-700", past_due: "bg-amber-100 text-amber-700",
  paused: "bg-gray-100 text-gray-500", canceled: "bg-red-100 text-red-600",
  expired: "bg-red-50 text-red-400",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OrgsClient({ rows }: { rows: OrgRow[] }) {
  const [q, setQ] = useState("");
  const [demoFilter, setDemoFilter] = useState<"all" | "real" | "demo">("all");

  const filtered = rows.filter((r) => {
    if (demoFilter === "real" && r.isDemo) return false;
    if (demoFilter === "demo" && !r.isDemo) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return r.name.toLowerCase().includes(s) || (r.ownerEmail ?? "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input placeholder="Search org or email…" value={q} onChange={(e) => setQ(e.target.value)}
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none" />
        <select value={demoFilter} onChange={(e) => setDemoFilter(e.target.value as any)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none">
          <option value="all">All</option>
          <option value="real">Real</option>
          <option value="demo">Demo</option>
        </select>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} of {rows.length} orgs</p>

      <div className="space-y-2">
        {filtered.map((org) => (
          <div key={org.id} className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-800 text-sm">{org.name}</p>
                  {org.isDemo && <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-semibold">DEMO</span>}
                  {org.membership && (
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${STATUS_BADGE[org.membership.status] ?? "bg-gray-100 text-gray-400"}`}>
                      {org.membership.status}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{org.ownerEmail ?? "No owner email"}</p>
                <div className="flex gap-3 mt-1 text-[11px] text-gray-400">
                  <span>{org.userCount} user{org.userCount !== 1 ? "s" : ""}</span>
                  <span>Created {fmtDate(org.createdAt)}</span>
                  {org.membership?.plan && org.membership.plan !== "none" && (
                    <span>Plan: {org.membership.plan}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <Link href={`/app/admin/memberships/${org.id}`}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white text-center"
                  style={{ backgroundColor: "#1B3A6B" }}>Membership</Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm">No orgs match your search.</div>
      )}
    </div>
  );
}
