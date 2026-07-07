"use client";

import { useState, useTransition } from "react";
import { MapPin, Building2, Star, ExternalLink, UserPlus, Check, Clock, X } from "lucide-react";

type Connection = { status: string; id: string } | null;

type Contractor = {
  org_id: string;
  slug: string | null;
  business_name: string;
  trade: string | null;
  tagline: string | null;
  phone: string | null;
  service_area: string | null;
  photo_url: string | null;
  years_experience: number | null;
  license_text: string | null;
  connection: Connection;
};

export default function DirectoryClient({
  contractors,
  realtorProfileId,
}: {
  contractors: Contractor[];
  realtorProfileId: string;
}) {
  const [list, setList] = useState(contractors);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [modal, setModal] = useState<{ orgId: string; businessName: string } | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = list.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.business_name.toLowerCase().includes(q) ||
      (c.trade ?? "").toLowerCase().includes(q) ||
      (c.service_area ?? "").toLowerCase().includes(q)
    );
  });

  function statusBadge(conn: Connection) {
    if (!conn) return null;
    const map: Record<string, { label: string; cls: string; Icon: typeof Check }> = {
      pending:  { label: "Pending",  cls: "bg-amber-100 text-amber-700",  Icon: Clock },
      accepted: { label: "Connected", cls: "bg-green-100 text-green-700",  Icon: Check },
      declined: { label: "Declined",  cls: "bg-red-100 text-red-700",      Icon: X    },
      canceled: { label: "Canceled",  cls: "bg-gray-100 text-gray-500",    Icon: X    },
    };
    const info = map[conn.status];
    if (!info) return null;
    const { label, cls, Icon } = info;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
        <Icon size={10} /> {label}
      </span>
    );
  }

  async function sendRequest(orgId: string) {
    setSending(orgId);
    try {
      const res = await fetch("/api/realtor/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, message: message.trim() || null }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setList((prev) =>
          prev.map((c) =>
            c.org_id === orgId
              ? { ...c, connection: { status: "pending", id: data.connection?.id ?? "" } }
              : c
          )
        );
      }
    } finally {
      setSending(null);
      setModal(null);
      setMessage("");
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contractor Directory</h1>
        <p className="text-sm text-gray-500 mt-1">Browse published TradeBase contractors and send connect requests.</p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, trade, or area…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MapPin size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No published contractors yet.</p>
          <p className="text-xs mt-1">Once contractors publish their profiles they&apos;ll appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((c) => (
            <div key={c.org_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4">
              <div className="shrink-0">
                {c.photo_url ? (
                  <img src={c.photo_url} alt={c.business_name} className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: "#1B3A6B" }}>
                    <Building2 size={24} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{c.business_name}</p>
                    {c.trade && <p className="text-xs text-blue-600 font-medium mt-0.5">{c.trade}</p>}
                  </div>
                  {c.slug && (
                    <a href={`/pro/${c.slug}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-600 shrink-0">
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
                {c.tagline && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.tagline}</p>}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                  {c.service_area && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <MapPin size={9} /> {c.service_area}
                    </span>
                  )}
                  {c.years_experience != null && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Star size={9} /> {c.years_experience} yrs
                    </span>
                  )}
                  {c.license_text && (
                    <span className="text-[10px] text-gray-400">{c.license_text}</span>
                  )}
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  {c.connection ? (
                    statusBadge(c.connection)
                  ) : (
                    <button
                      onClick={() => setModal({ orgId: c.org_id, businessName: c.business_name })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: "#1B3A6B" }}
                    >
                      <UserPlus size={12} /> Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-1">Connect with {modal.businessName}</h2>
            <p className="text-xs text-gray-500 mb-4">
              Send a connection request. The contractor can accept or decline.
            </p>
            <textarea
              rows={3}
              placeholder="Optional message (e.g. &ldquo;I&apos;m a local realtor looking to collaborate…&rdquo;)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setModal(null); setMessage(""); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => sendRequest(modal.orgId)}
                disabled={sending === modal.orgId}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                {sending === modal.orgId ? "Sending…" : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
