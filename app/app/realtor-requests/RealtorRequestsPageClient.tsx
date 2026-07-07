"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Clock, UserCheck, FileText, AlertCircle, Building2 } from "lucide-react";

type Connection = {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
  updated_at: string;
  realtor_profiles: {
    id: string;
    display_name: string;
    agency_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    slug: string | null;
  } | null;
};

type RealtorLead = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  job_type: string | null;
  notes: string | null;
  created_at: string;
  realtor_profiles: { display_name: string; agency_name: string | null } | null;
};

function leadStatusInfo(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    new:       { label: "New",       cls: "bg-blue-100 text-blue-700"     },
    contacted: { label: "Contacted", cls: "bg-purple-100 text-purple-700" },
    quoted:    { label: "Quoted",    cls: "bg-amber-100 text-amber-700"   },
    scheduled: { label: "Scheduled", cls: "bg-teal-100 text-teal-700"     },
    won:       { label: "Won",       cls: "bg-green-100 text-green-700"   },
    lost:      { label: "Lost",      cls: "bg-red-100 text-red-700"       },
  };
  return map[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" };
}

export default function RealtorRequestsPageClient({
  connections: initialConns,
  realtorLeads,
  connsMigrationPending,
  leadsMigrationPending,
}: {
  connections: Connection[];
  realtorLeads: RealtorLead[];
  connsMigrationPending: boolean;
  leadsMigrationPending: boolean;
}) {
  const [tab, setTab] = useState<"connections" | "leads">("connections");
  const [connections, setConnections] = useState(initialConns);
  const [actingId, setActingId] = useState<string | null>(null);

  const pendingCount = connections.filter((c) => c.status === "pending").length;

  async function respond(id: string, status: "accepted" | "declined") {
    setActingId(id);
    await fetch(`/api/app/realtor-connections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setConnections((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
    setActingId(null);
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Realtor Requests</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connection requests from realtors and work requests they&apos;ve sent on behalf of clients.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("connections")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === "connections"
              ? "text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
          style={tab === "connections" ? { backgroundColor: "#1B3A6B" } : {}}
        >
          Connect Requests
          {pendingCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("leads")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === "leads"
              ? "text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
          style={tab === "leads" ? { backgroundColor: "#1B3A6B" } : {}}
        >
          Work Requests
          {realtorLeads.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
              {realtorLeads.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Connect Requests tab ── */}
      {tab === "connections" && (
        <>
          {connsMigrationPending && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
              <strong>Migration pending.</strong> Apply{" "}
              <code className="text-xs bg-amber-100 px-1 rounded">supabase/migration_realtor_connections.sql</code>{" "}
              in Supabase Studio to enable realtor connections.
            </div>
          )}

          {connections.length === 0 && !connsMigrationPending ? (
            <div className="text-center py-16 text-gray-400">
              <Building2 size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No realtor connection requests yet.</p>
              <p className="text-xs mt-1">When a realtor requests to connect, it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((c) => {
                const rp = c.realtor_profiles;
                const isPending = c.status === "pending";
                return (
                  <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start gap-3">
                      {rp?.avatar_url ? (
                        <img src={rp.avatar_url} alt={rp.display_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: "#1B3A6B" }}>
                          {rp?.display_name?.charAt(0) ?? "R"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 justify-between flex-wrap">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{rp?.display_name ?? "Realtor"}</p>
                            {rp?.agency_name && <p className="text-xs text-gray-500">{rp.agency_name}</p>}
                            {rp?.phone && <p className="text-xs text-gray-400">{rp.phone}</p>}
                          </div>
                          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            c.status === "accepted" ? "bg-green-100 text-green-700" :
                            c.status === "declined" ? "bg-red-100 text-red-700" :
                            c.status === "canceled" ? "bg-gray-100 text-gray-500" :
                            "bg-amber-100 text-amber-700"
                          }`}>
                            {c.status === "accepted" && <Check size={10} />}
                            {c.status === "declined" && <X size={10} />}
                            {c.status === "pending"  && <Clock size={10} />}
                            {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                          </span>
                        </div>
                        {c.message && (
                          <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{c.message}&rdquo;</p>
                        )}
                        <p className="text-[10px] text-gray-300 mt-1">
                          {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        {isPending && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => respond(c.id, "accepted")}
                              disabled={actingId === c.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
                              style={{ backgroundColor: "#1B3A6B" }}
                            >
                              <Check size={12} /> Accept
                            </button>
                            <button
                              onClick={() => respond(c.id, "declined")}
                              disabled={actingId === c.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-60"
                            >
                              <X size={12} /> Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Work Requests (Leads) tab ── */}
      {tab === "leads" && (
        <>
          {leadsMigrationPending && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
              <strong>Migration pending.</strong> Apply{" "}
              <code className="text-xs bg-amber-100 px-1 rounded">supabase/migration_realtor_connections.sql</code>{" "}
              to see realtor-originated leads here.
            </div>
          )}

          {realtorLeads.length === 0 && !leadsMigrationPending ? (
            <div className="text-center py-16 text-gray-400">
              <FileText size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No realtor work requests yet.</p>
              <p className="text-xs mt-1">Once connected realtors submit work requests, they&apos;ll appear here and in your Leads pipeline.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {realtorLeads.map((lead) => {
                const { label, cls } = leadStatusInfo(lead.status);
                return (
                  <Link key={lead.id} href={`/app/leads/${lead.id}`} className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-blue-200 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 text-sm">{lead.name}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
                            {label}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
                            🏡 Realtor
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          From <strong>{lead.realtor_profiles?.display_name ?? "Realtor"}</strong>
                          {lead.realtor_profiles?.agency_name && ` · ${lead.realtor_profiles.agency_name}`}
                          {lead.job_type && ` · ${lead.job_type}`}
                        </p>
                        {lead.phone && <p className="text-xs text-gray-400 mt-0.5">{lead.phone}</p>}
                        {lead.email && <p className="text-xs text-gray-400">{lead.email}</p>}
                        <p className="text-[10px] text-gray-300 mt-1">
                          {new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-4 text-center">
            <Link
              href="/app/leads"
              className="text-sm text-blue-600 hover:underline"
            >
              View all leads in pipeline →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
