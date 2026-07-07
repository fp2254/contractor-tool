"use client";

import { useState } from "react";
import Link from "next/link";
import { Link2, Clock, Check, X, RefreshCw, SendHorizonal } from "lucide-react";

type Connection = {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
  updated_at: string;
  org_id: string;
  orgs: { name: string } | null;
};

type WorkRequestForm = {
  connectionId: string;
  orgId: string;
  orgName: string;
};

export default function ConnectionsClient({
  connections: initial,
  migrationPending,
  realtorProfileId,
}: {
  connections: Connection[];
  migrationPending: boolean;
  realtorProfileId: string;
}) {
  const [connections, setConnections] = useState(initial);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState<WorkRequestForm | null>(null);
  const [form, setForm] = useState({
    client_name: "", client_phone: "", client_email: "", client_address: "", job_type: "", description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function cancelConnection(id: string) {
    setCancelingId(id);
    await fetch(`/api/realtor/connections/${id}`, { method: "DELETE" });
    setConnections((prev) =>
      prev.map((c) => c.id === id ? { ...c, status: "canceled" } : c)
    );
    setCancelingId(null);
  }

  async function submitWorkRequest() {
    if (!requestForm || !form.client_name.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/realtor/work-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connection_id: requestForm.connectionId,
        org_id: requestForm.orgId,
        client_name: form.client_name,
        client_phone: form.client_phone,
        client_email: form.client_email,
        client_address: form.client_address,
        job_type: form.job_type,
        description: form.description,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setSuccessMsg(`Work request sent to ${requestForm.orgName}!`);
      setRequestForm(null);
      setForm({ client_name: "", client_phone: "", client_email: "", client_address: "", job_type: "", description: "" });
    }
  }

  function statusInfo(status: string) {
    const map: Record<string, { label: string; cls: string; Icon: typeof Check }> = {
      pending:  { label: "Pending",   cls: "bg-amber-100 text-amber-700", Icon: Clock },
      accepted: { label: "Connected", cls: "bg-green-100 text-green-700", Icon: Check },
      declined: { label: "Declined",  cls: "bg-red-100 text-red-700",     Icon: X    },
      canceled: { label: "Canceled",  cls: "bg-gray-100 text-gray-500",   Icon: X    },
    };
    return map[status] ?? { label: status, cls: "bg-gray-100 text-gray-500", Icon: Clock };
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
          <p className="text-sm text-gray-500 mt-1">Contractors you&apos;ve requested to connect with.</p>
        </div>
        <Link
          href="/realtor/directory"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: "#1B3A6B" }}
        >
          <Link2 size={14} /> Find Contractors
        </Link>
      </div>

      {successMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-green-600"><X size={14} /></button>
        </div>
      )}

      {migrationPending && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <strong>Migration pending.</strong> Apply <code className="text-xs bg-amber-100 px-1 rounded">supabase/migration_realtor_connections.sql</code> in Supabase Studio to enable connections.
        </div>
      )}

      {connections.length === 0 && !migrationPending ? (
        <div className="text-center py-16 text-gray-400">
          <Link2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No connections yet.</p>
          <p className="text-xs mt-1">Browse the directory and send a connect request.</p>
          <Link
            href="/realtor/directory"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: "#1B3A6B" }}
          >
            Browse Directory
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((c) => {
            const { label, cls, Icon } = statusInfo(c.status);
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {c.orgs?.name ?? "Contractor"}
                    </p>
                    {c.message && (
                      <p className="text-xs text-gray-500 mt-0.5 italic">&ldquo;{c.message}&rdquo;</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      Sent {new Date(c.created_at).toLocaleDateString()}
                      {c.updated_at !== c.created_at && ` · Updated ${new Date(c.updated_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${cls}`}>
                    <Icon size={10} /> {label}
                  </span>
                </div>
                {c.status === "accepted" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() =>
                        setRequestForm({ connectionId: c.id, orgId: c.org_id, orgName: c.orgs?.name ?? "Contractor" })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{ backgroundColor: "#1B3A6B" }}
                    >
                      <SendHorizonal size={12} /> Send Work Request
                    </button>
                  </div>
                )}
                {(c.status === "pending" || c.status === "accepted") && (
                  <div className="mt-2">
                    <button
                      onClick={() => cancelConnection(c.id)}
                      disabled={cancelingId === c.id}
                      className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 flex items-center gap-1"
                    >
                      <RefreshCw size={10} /> {cancelingId === c.id ? "Canceling…" : "Cancel Request"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {requestForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-gray-900 mb-1">Send Work Request</h2>
            <p className="text-xs text-gray-500 mb-4">
              To <strong>{requestForm.orgName}</strong> — this will create a new lead in their pipeline.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Client Name *</label>
                <input
                  value={form.client_name}
                  onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone</label>
                  <input
                    value={form.client_phone}
                    onChange={(e) => setForm((f) => ({ ...f, client_phone: e.target.value }))}
                    placeholder="Phone"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                  <input
                    value={form.client_email}
                    onChange={(e) => setForm((f) => ({ ...f, client_email: e.target.value }))}
                    placeholder="Email"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Address</label>
                <input
                  value={form.client_address}
                  onChange={(e) => setForm((f) => ({ ...f, client_address: e.target.value }))}
                  placeholder="Property address"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Work Type</label>
                <input
                  value={form.job_type}
                  onChange={(e) => setForm((f) => ({ ...f, job_type: e.target.value }))}
                  placeholder="e.g. Roof inspection, HVAC"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Additional details…"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setRequestForm(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitWorkRequest}
                disabled={submitting || !form.client_name.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                {submitting ? "Sending…" : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
