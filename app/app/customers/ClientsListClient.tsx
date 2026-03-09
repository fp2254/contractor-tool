"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { BusinessCardScanner } from "@/components/BusinessCardScanner";
import type { CardScanResult } from "@/app/api/ai/card-scan/route";
import { SwipeActionRow } from "@/components/SwipeActionRow";

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
  archived?: boolean | null;
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

type Mode = "idle" | "choosing" | "scanning" | "manual";

export default function ClientsListClient({ clients: initial }: { clients: ClientRow[] }) {
  const [clients, setClients] = useState(initial);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("idle");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setMode("choosing");
      router.replace("/app/customers");
    }
  }, [searchParams, router]);

  const active = clients.filter(c => !c.archived);

  const filtered = active.filter(c => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    const name = `${c.first_name} ${c.last_name ?? ""}`.toLowerCase();
    return (
      name.includes(s) ||
      (c.company_name ?? "").toLowerCase().includes(s) ||
      (c.phone ?? "").replace(/\D/g, "").includes(s.replace(/\D/g, "")) ||
      (c.email ?? "").toLowerCase().includes(s) ||
      (c.address_line1 ?? "").toLowerCase().includes(s) ||
      (c.city ?? "").toLowerCase().includes(s)
    );
  });

  function handleScanned(data: CardScanResult) {
    const nameParts = data.name.trim().split(/\s+/);
    const first = nameParts[0] ?? "";
    const last = nameParts.slice(1).join(" ");
    const addressParts = data.address.split(",").map(s => s.trim());
    setForm({
      first_name: first,
      last_name: last,
      phone: data.phone,
      email: data.email,
      address_line1: addressParts[0] ?? "",
      city: addressParts[1] ?? "",
      state: addressParts[2] ?? "",
      notes: [data.website, data.company].filter(Boolean).join(" · "),
    });
    setMode("manual");
  }

  function reset() {
    setMode("idle");
    setForm(EMPTY_FORM);
    setError("");
  }

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
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(id: string) {
    const res = await fetch(`/app/customers/api/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (!res.ok) {
      const j = await res.json() as { error?: string };
      throw new Error(j.error ?? "Archive failed");
    }
    setClients(prev => prev.filter(c => c.id !== id));
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/app/customers/api/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json() as { error?: string };
      throw new Error(j.error ?? "Delete failed");
    }
    setClients(prev => prev.filter(c => c.id !== id));
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-slate-800">Clients</h1>
        <button
          onClick={() => setMode("choosing")}
          className="rounded-xl px-4 py-2 text-white font-semibold text-sm"
          style={{ backgroundColor: "#1B3A6B" }}>
          + Add Client
        </button>
      </div>

      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          inputMode="search"
          placeholder="Search clients, phone, or address"
          value={q}
          onChange={e => setQ(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          className="w-full rounded-xl border border-gray-200 pl-9 pr-9 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-sm leading-none">
            ✕
          </button>
        )}
      </div>

      {mode === "choosing" && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-3 space-y-3">
          <p className="text-sm font-bold text-[#1B3A6B]">Add New Client</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("manual")}
              className="flex flex-col items-center gap-2 bg-white rounded-xl py-4 px-3 shadow-sm active:bg-gray-50 border border-gray-100">
              <svg className="w-6 h-6 text-[#1B3A6B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-xs font-semibold text-slate-700">Manual Entry</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("scanning")}
              className="flex flex-col items-center gap-2 rounded-xl py-4 px-3 active:opacity-80 border border-blue-200"
              style={{ backgroundColor: "#1B3A6B" }}>
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-semibold text-white">Scan Business Card</span>
            </button>
          </div>
          <button type="button" onClick={reset} className="w-full text-xs text-gray-400 py-1">Cancel</button>
        </div>
      )}

      {mode === "scanning" && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-3">
          <p className="text-sm font-bold text-[#1B3A6B] mb-3">Scan Business Card</p>
          <BusinessCardScanner
            onExtracted={handleScanned}
            onCancel={reset}
          />
        </div>
      )}

      {mode === "manual" && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3 mb-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#1B3A6B]">New Client</p>
            <button type="button" onClick={() => setMode("scanning")}
              className="flex items-center gap-1 text-xs font-medium text-[#1B3A6B] bg-white rounded-lg px-2.5 py-1.5 border border-blue-100">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Scan instead
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <form onSubmit={handleCreate} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="First name *" value={form.first_name}
                onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white" />
              <input placeholder="Last name" value={form.last_name}
                onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white" />
            </div>
            <input placeholder="Phone" type="tel" value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white" />
            <input placeholder="Email" type="email" value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white" />
            <input placeholder="Address" value={form.address_line1}
              onChange={e => setForm(p => ({ ...p, address_line1: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="City" value={form.city}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white" />
              <input placeholder="State" maxLength={2} value={form.state}
                onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white" />
            </div>
            <textarea placeholder="Notes (optional)" value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white" />
            <div className="flex gap-2">
              <button type="button" onClick={reset}
                className="flex-1 rounded-xl py-2 text-sm font-semibold border border-gray-200 text-gray-500 bg-white">
                Cancel
              </button>
              <button type="submit" disabled={saving}
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
              <SwipeActionRow
                key={c.id}
                itemId={c.id}
                openItemId={openSwipeId}
                setOpenItemId={setOpenSwipeId}
                onArchive={() => handleArchive(c.id)}
                onDelete={() => handleDelete(c.id)}
                archiveLabel="Archive"
                archiveColor="#64748b"
                deleteConfirmMessage={`Permanently delete ${name}? This cannot be undone.`}
              >
                <Link
                  href={`/app/customers/${c.id}`}
                  className="block bg-white p-4"
                  style={{ pointerEvents: openSwipeId === c.id ? "none" : "auto" }}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: "#1B3A6B" }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800">{name}</p>
                      {address && <p className="text-xs text-gray-500 truncate">{address}</p>}
                      {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                      <div className="flex items-center gap-3 mt-1.5">
                        {c.lifetimeValue > 0 && (
                          <span className="text-xs font-semibold text-green-700">${c.lifetimeValue.toLocaleString()} lifetime</span>
                        )}
                        {c.lastJobDate && (
                          <span className="text-xs text-gray-400">Last job: {new Date(c.lastJobDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        )}
                      </div>
                      {(c.hasOverdue || c.hasUpcomingJob || c.hasQuotePending) && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {c.hasOverdue && <span className="text-[10px] bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-medium">Overdue Invoice</span>}
                          {c.hasUpcomingJob && <span className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">Upcoming Job</span>}
                          {c.hasQuotePending && <span className="text-[10px] bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5 font-medium">Quote Pending</span>}
                        </div>
                      )}
                    </div>
                    <span className="text-gray-300 mt-1 shrink-0">›</span>
                  </div>
                </Link>
              </SwipeActionRow>
            );
          })}
        </div>
      )}
    </>
  );
}
