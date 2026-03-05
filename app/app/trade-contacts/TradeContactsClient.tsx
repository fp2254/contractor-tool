"use client";

import { useState } from "react";

export type TradeContact = {
  id: string;
  name: string;
  company: string | null;
  trade: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
};

const TRADES = [
  "Electrician", "Plumber", "HVAC", "Framer", "Roofer", "Drywaller",
  "Painter", "Landscaper", "Concrete", "Mason", "Welder", "Insulation",
  "Flooring", "Tile", "Glazier", "Other",
];

const TRADE_COLORS: Record<string, string> = {
  Electrician: "bg-yellow-100 text-yellow-700",
  Plumber: "bg-blue-100 text-blue-700",
  HVAC: "bg-cyan-100 text-cyan-700",
  Framer: "bg-amber-100 text-amber-700",
  Roofer: "bg-orange-100 text-orange-700",
  Drywaller: "bg-gray-100 text-gray-600",
  Painter: "bg-purple-100 text-purple-700",
  Landscaper: "bg-green-100 text-green-700",
  Concrete: "bg-stone-100 text-stone-700",
  Mason: "bg-red-100 text-red-700",
};

function NewContactForm({ onCreated, onCancel }: { onCreated: (c: TradeContact) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [trade, setTrade] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/app/trade-contacts/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, trade, phone, email, notes }),
      });
      const data = await res.json() as TradeContact & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onCreated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
      <p className="text-sm font-bold text-[#1B3A6B]">New Contact</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          required
          placeholder="Full name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          />
          <select
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white">
            <option value="">Trade / Specialty</option>
            {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <input
          placeholder="Phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
        />
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
        />
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white resize-none"
        />
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl py-2.5 text-white font-semibold text-sm disabled:opacity-60"
            style={{ backgroundColor: "#1B3A6B" }}>
            {saving ? "Saving…" : "Add Contact"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2.5 border border-gray-200 text-sm font-semibold text-slate-600">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function buildShareText(contact: TradeContact): string {
  const lines: string[] = [];
  lines.push(`Contact: ${contact.name}`);
  if (contact.trade) lines.push(contact.company ? `${contact.trade} · ${contact.company}` : contact.trade);
  else if (contact.company) lines.push(contact.company);
  if (contact.phone) lines.push(`📞 ${contact.phone}`);
  if (contact.email) lines.push(`✉️ ${contact.email}`);
  if (contact.notes) lines.push(`Notes: ${contact.notes}`);
  return lines.join("\n");
}

function ContactCard({ contact, onDelete }: { contact: TradeContact; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [shared, setShared] = useState(false);
  const tradeColor = contact.trade ? (TRADE_COLORS[contact.trade] ?? "bg-gray-100 text-gray-600") : null;

  async function handleShare() {
    const text = buildShareText(contact);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: contact.name, text });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        // user cancelled — do nothing
      }
    } else {
      // Fallback: open SMS app with body pre-filled
      window.open(`sms:?body=${encodeURIComponent(text)}`, "_blank");
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove ${contact.name}?`)) return;
    setDeleting(true);
    try {
      await fetch(`/app/trade-contacts/api/${contact.id}`, { method: "DELETE" });
      onDelete(contact.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: "#1B3A6B" }}>
          {contact.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <button onClick={() => setExpanded((v) => !v)} className="text-left w-full">
            <p className="text-sm font-bold text-slate-800 leading-snug">{contact.name}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {contact.trade && tradeColor && (
                <span className={`text-xs rounded-full px-2 py-0.5 font-semibold ${tradeColor}`}>{contact.trade}</span>
              )}
              {contact.company && (
                <span className="text-xs text-gray-400">{contact.company}</span>
              )}
            </div>
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
              {contact.phone && (
                <a href={`tel:${contact.phone}`}
                  className="flex items-center gap-2 text-sm text-[#1B3A6B] font-semibold">
                  📞 {contact.phone}
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 text-sm text-[#1B3A6B]">
                  ✉️ {contact.email}
                </a>
              )}
              {contact.notes && (
                <p className="text-xs text-gray-500 italic">{contact.notes}</p>
              )}
              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-sm font-semibold rounded-xl px-3 py-2 w-full transition-colors"
                style={{ backgroundColor: shared ? "#22C55E" : "#F0F4FF", color: shared ? "white" : "#1B3A6B" }}>
                {shared ? "✓ Shared!" : "📤 Share this contact"}
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {contact.phone && (
            <a href={`tel:${contact.phone}`}
              className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 text-sm">
              📞
            </a>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-gray-300 hover:text-red-400 p-1 text-sm">
            {deleting ? "…" : "✕"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TradeContactsClient({ initialContacts }: { initialContacts: TradeContact[] }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState("");

  const filtered = contacts.filter(
    (c) =>
      !q ||
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      (c.trade ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (c.company ?? "").toLowerCase().includes(q.toLowerCase())
  );

  function handleCreated(contact: TradeContact) {
    setContacts((prev) => [contact, ...prev]);
    setShowForm(false);
  }

  function handleDelete(id: string) {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white font-semibold"
        style={{ backgroundColor: "#1B3A6B" }}>
        <span className="text-lg">+</span> Add Contact
      </button>

      {showForm && (
        <NewContactForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
      )}

      <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          className="flex-1 text-sm outline-none bg-transparent"
          placeholder="Search contacts"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 && !showForm && (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
          {q ? `No contacts matching "${q}"` : "No contacts yet. Tap Add Contact to get started."}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((c) => (
          <ContactCard key={c.id} contact={c} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
