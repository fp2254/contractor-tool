"use client";

import { useState } from "react";

type Member = {
  id: string;
  userId: string;
  role: string;
  createdAt: string;
  email: string;
  name: string | null;
};

const ROLE_COLORS: Record<string, string> = {
  owner:  "bg-amber-100 text-amber-700",
  admin:  "bg-blue-100 text-blue-700",
  member: "bg-gray-100 text-gray-600",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function initials(name: string | null, email: string) {
  if (name) return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

export default function TeamClient({ members }: { members: Member[] }) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (res.ok) {
        setInviteMsg({ ok: true, text: `Invite sent to ${inviteEmail.trim()}` });
        setInviteEmail("");
        setShowInvite(false);
      } else {
        setInviteMsg({ ok: false, text: json.error ?? "Failed to send invite" });
      }
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="space-y-4">
      {inviteMsg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${inviteMsg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {inviteMsg.text}
        </div>
      )}

      {/* Members list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Members ({members.length})
          </p>
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No team members yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: "#1B3A6B" }}>
                  {initials(m.name, m.email)}
                </div>
                <div className="flex-1 min-w-0">
                  {m.name && <p className="text-sm font-semibold text-slate-800 truncate">{m.name}</p>}
                  <p className="text-sm text-gray-500 truncate">{m.email}</p>
                  <p className="text-xs text-gray-400">Joined {fmtDate(m.createdAt)}</p>
                </div>
                <span className={`text-xs font-semibold rounded-full px-2.5 py-1 capitalize ${ROLE_COLORS[m.role] ?? ROLE_COLORS.member}`}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite section */}
      {showInvite ? (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Invite a team member</p>
          <form onSubmit={handleInvite} className="space-y-3">
            <input
              type="email"
              required
              placeholder="their@email.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={inviting}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: "#1B3A6B" }}>
                {inviting ? "Sending…" : "Send Invite"}
              </button>
              <button
                type="button"
                onClick={() => { setShowInvite(false); setInviteEmail(""); }}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold bg-gray-100 text-gray-600">
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowInvite(true)}
          className="w-full rounded-xl py-3 text-white font-semibold flex items-center justify-center gap-2"
          style={{ backgroundColor: "#1B3A6B" }}>
          <span className="text-lg leading-none">+</span> Invite Team Member
        </button>
      )}

      <p className="text-xs text-gray-400 text-center px-4">
        Team members you invite will receive an email to join your TradeBase workspace.
      </p>
    </div>
  );
}
