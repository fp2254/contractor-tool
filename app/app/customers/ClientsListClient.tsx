"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

export type ClientRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  lifetimeValue: number;
  lastJobDate: string | null;
  hasOverdue: boolean;
  hasUpcomingJob: boolean;
  hasQuotePending: boolean;
};

type FormState = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address_line1: string;
  city: string;
  state: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  first_name: "", last_name: "", phone: "", email: "",
  address_line1: "", city: "", state: "", notes: "",
};

export default function ClientsListClient({ clients: initial }: { clients: ClientRow[] }) {
  const [clients, setClients] = useState(initial);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowForm(true);
      router.replace("/app/customers");
    }
  }, [searchParams, router]);

  const filtered = clients.filter(c => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    const name = `${c.first_name} ${c.last_name ?? ""}`.toLowerCase();
    return (
      name.includes(s) ||
      (c.phone ?? "").replace(/\D/g, "").includes(s.replace(/\D/g, "")) ||
      (c.email ?? "").toLowerCase().includes(s) ||
      (c.address_line1 ?? "").toLowerCase().includes(s) ||
      (c.city ?? "").toLowerCase().includes(s)
    );
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/app/customers/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as ClientRow & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setClients(prev => [data, ...prev]);
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-slate-800">Clients</h1>
        <button
          onClick={() => setShowForm(v => !v)}
          className="rounded-xl px-4 py-2 text-white font-semibold text-sm"
          style={{ backgroundColor: "#1B3A6B" }}>
          + Add Client
        </button>
      </div>

      <input
        type="search"
        placeholder="Search clients, phone, or address"
        value={q}
        onChange={e => setQ(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100 mb-3"
      />

      {showForm && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3 mb-3">
          <p className="text-sm font-bold text-[#1B3A6B]">New Client</p>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <form onSubmit={handleCreate} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                required
                placeholder="First name *"
                value={form.first_name}
                onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
              <input
                placeholder="Last name"
                value={form.last_name}
                onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>
            <input
              placeholder="Phone"
              type="tel"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            />
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            />
            <input
              placeholder="Address"
              value={form.address_line1}
              onChange={e => setForm(p => ({ ...p, address_line1: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="City"
                value={form.city}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
              <input
                placeholder="State"
                maxLength={2}
                value={form.state}
                onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>
            <textarea
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(""); }}
                className="flex-1 rounded-xl py-2 text-sm font-semibold border border-gray-200 text-gray-500 bg-white">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl py-2 text-white font-semibold text-sm disabled:opacity-60"
                style={{ backgroundColor: "#1B3A6B" }}>
                {saving ? "Saving…" : "Save Client"}
              </button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
          {q ? `No clients matching "${q}"` : "No clients yet. Tap + Add Client to get started."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "Unnamed";
            const address = [c.address_line1, c.city].filter(Boolean).join(" • ");
            return (
              <Link key={c.id} href={`/app/customers/${c.id}`} className="block bg-white rounded-2xl p-4 shadow-sm active:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: "#1B3A6B" }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800">{name}</p>
                    {address && <p className="text-xs text-gray-500 truncate">{address}</p>}
                    {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                    <div className="flex items-center gap-3 mt-1.5">
                      {c.lifetimeValue > 0 && (
                        <span className="text-xs font-semibold text-green-700">
                          ${c.lifetimeValue.toLocaleString()} lifetime
                        </span>
                      )}
                      {c.lastJobDate && (
                        <span className="text-xs text-gray-400">
                          Last job: {new Date(c.lastJobDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                    {(c.hasOverdue || c.hasUpcomingJob || c.hasQuotePending) && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {c.hasOverdue && (
                          <span className="text-[10px] bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-medium">
                            Overdue Invoice
                          </span>
                        )}
                        {c.hasUpcomingJob && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                            Upcoming Job
                          </span>
                        )}
                        {c.hasQuotePending && (
                          <span className="text-[10px] bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5 font-medium">
                            Quote Pending
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-gray-300 mt-1 shrink-0">›</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
