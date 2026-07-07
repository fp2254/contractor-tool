"use client";

import Link from "next/link";
import { SendHorizonal, Clock, Check, AlertCircle, UserCheck, FileText } from "lucide-react";

type Request = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  job_type: string | null;
  notes: string | null;
  created_at: string;
  org_id: string;
  orgs: { name: string } | null;
};

function statusInfo(status: string) {
  const map: Record<string, { label: string; cls: string; Icon: typeof Check }> = {
    new:       { label: "New",       cls: "bg-blue-100 text-blue-700",   Icon: Clock       },
    contacted: { label: "Contacted", cls: "bg-purple-100 text-purple-700", Icon: UserCheck  },
    quoted:    { label: "Quoted",    cls: "bg-amber-100 text-amber-700",  Icon: FileText    },
    scheduled: { label: "Scheduled", cls: "bg-teal-100 text-teal-700",   Icon: Clock       },
    won:       { label: "Won",       cls: "bg-green-100 text-green-700",  Icon: Check       },
    lost:      { label: "Lost",      cls: "bg-red-100 text-red-700",      Icon: AlertCircle },
  };
  return map[status] ?? { label: status, cls: "bg-gray-100 text-gray-500", Icon: Clock };
}

export default function RequestsClient({
  requests,
  migrationPending,
}: {
  requests: Request[];
  migrationPending: boolean;
}) {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
        <p className="text-sm text-gray-500 mt-1">Work requests you&apos;ve sent to connected contractors.</p>
      </div>

      {migrationPending && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <strong>Migration pending.</strong> Apply <code className="text-xs bg-amber-100 px-1 rounded">supabase/migration_realtor_connections.sql</code> to track requests.
        </div>
      )}

      {requests.length === 0 && !migrationPending ? (
        <div className="text-center py-16 text-gray-400">
          <SendHorizonal size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No work requests sent yet.</p>
          <p className="text-xs mt-1">
            Once connected to a contractor, you can send work requests from{" "}
            <Link href="/realtor/connections" className="text-blue-600 underline">Connections</Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const { label, cls, Icon } = statusInfo(r.status);
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
                        <Icon size={10} /> {label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Sent to <strong>{r.orgs?.name ?? "Contractor"}</strong>
                      {r.job_type && ` · ${r.job_type}`}
                    </p>
                    {r.phone && <p className="text-xs text-gray-400 mt-0.5">{r.phone}</p>}
                    {r.email && <p className="text-xs text-gray-400">{r.email}</p>}
                    <p className="text-[10px] text-gray-300 mt-1">
                      {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/realtor/connections"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: "#1B3A6B" }}
        >
          <SendHorizonal size={14} /> Send Another Request
        </Link>
      </div>
    </div>
  );
}
