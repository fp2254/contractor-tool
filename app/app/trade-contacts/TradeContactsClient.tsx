"use client";

import { useState, useRef, useEffect } from "react";
import { BusinessCardScanner } from "@/components/BusinessCardScanner";
import type { CardScanResult } from "@/app/api/ai/card-scan/route";

export type TradeContact = {
  id: string;
  name: string;
  company: string | null;
  trade: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  archived: boolean | null;
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

type ContactFormValues = {
  name: string; company: string; trade: string;
  phone: string; email: string; notes: string;
};
const EMPTY: ContactFormValues = { name: "", company: "", trade: "", phone: "", email: "", notes: "" };
type Mode = "idle" | "choosing" | "scanning" | "manual";

const REVEAL_WIDTH = 148;

function NewContactForm({
  initial, onCreated, onCancel, onScanInstead,
}: {
  initial: ContactFormValues;
  onCreated: (c: TradeContact) => void;
  onCancel: () => void;
  onScanInstead: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [company, setCompany] = useState(initial.company);
  const [trade, setTrade] = useState(initial.trade);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [notes, setNotes] = useState(initial.notes);
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
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-[#1B3A6B]">New Contact</p>
        <button type="button" onClick={onScanInstead}
          className="flex items-center gap-1 text-xs font-medium text-[#1B3A6B] bg-white rounded-lg px-2.5 py-1.5 border border-blue-100">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Scan instead
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-2">
        <input required placeholder="Full name *" value={name} onChange={e => setName(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white" />
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Company" value={company} onChange={e => setCompany(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white" />
          <select value={trade} onChange={e => setTrade(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white">
            <option value="">Trade / Specialty</option>
            {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <input placeholder="Phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white" />
        <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white" />
        <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)}
          rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white resize-none" />
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving}
            className="flex-1 rounded-xl py-2.5 text-white font-semibold text-sm disabled:opacity-60"
            style={{ backgroundColor: "#1B3A6B" }}>
            {saving ? "Saving…" : "Add Contact"}
          </button>
          <button type="button" onClick={onCancel}
            className="rounded-xl px-4 py-2.5 border border-gray-200 text-sm font-semibold text-slate-600">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function buildShareText(contact: TradeContact): string {
  const lines: string[] = [`Contact: ${contact.name}`];
  if (contact.trade) lines.push(contact.company ? `${contact.trade} · ${contact.company}` : contact.trade);
  else if (contact.company) lines.push(contact.company);
  if (contact.phone) lines.push(`📞 ${contact.phone}`);
  if (contact.email) lines.push(`✉️ ${contact.email}`);
  if (contact.notes) lines.push(`Notes: ${contact.notes}`);
  return lines.join("\n");
}

function ContactCard({
  contact,
  onDelete,
  onArchiveToggle,
  openId,
  setOpenId,
}: {
  contact: TradeContact;
  onDelete: (id: string) => void;
  onArchiveToggle: (id: string, archived: boolean) => void;
  openId: string | null;
  setOpenId: (id: string | null) => void;
}) {
  const isArchived = contact.archived === true;
  const isSwipeOpen = openId === contact.id;
  const tradeColor = contact.trade ? (TRADE_COLORS[contact.trade] ?? "bg-gray-100 text-gray-600") : null;

  const [offset, setOffset] = useState(0);
  const [snap, setSnap] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [shared, setShared] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  function snapTo(x: number) {
    setSnap(true);
    setOffset(x);
    setTimeout(() => setSnap(false), 230);
  }

  useEffect(() => {
    if (wasOpen.current && !isSwipeOpen) snapTo(0);
    wasOpen.current = isSwipeOpen;
  }, [isSwipeOpen]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let dir: "none" | "h" | "v" = "none";
    let active = false;

    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dir = "none";
      active = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!active) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      if (dir === "none") {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        dir = Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
        if (dir === "v") { active = false; return; }
      }

      e.preventDefault();

      const base = isSwipeOpen ? -REVEAL_WIDTH : 0;
      const raw = base + dx;
      setOffset(Math.max(-REVEAL_WIDTH, Math.min(10, raw)));
      setSnap(false);
    }

    function onTouchEnd(e: TouchEvent) {
      if (!active || dir !== "h") { active = false; return; }
      active = false;

      const dx = e.changedTouches[0].clientX - startX;

      if (!isSwipeOpen && dx < -50) {
        setOpenId(contact.id);
        snapTo(-REVEAL_WIDTH);
      } else if (isSwipeOpen && dx > 50) {
        setOpenId(null);
        snapTo(0);
      } else {
        snapTo(isSwipeOpen ? -REVEAL_WIDTH : 0);
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [isSwipeOpen, contact.id, setOpenId]);

  function handleCardTap() {
    if (isSwipeOpen) {
      setOpenId(null);
      snapTo(0);
      return;
    }
    setExpanded(v => !v);
  }

  async function handleShare() {
    const text = buildShareText(contact);
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: contact.name, text }); setShared(true); setTimeout(() => setShared(false), 2000); } catch { /* cancelled */ }
    } else {
      window.open(`sms:?body=${encodeURIComponent(text)}`, "_blank");
    }
  }

  async function handleArchiveToggle() {
    setToggling(true);
    try {
      const res = await fetch(`/app/trade-contacts/api/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !isArchived }),
      });
      if (res.ok) {
        setOpenId(null);
        closeSwipe();
        onArchiveToggle(contact.id, !isArchived);
      }
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Permanently delete ${contact.name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/app/trade-contacts/api/${contact.id}`, { method: "DELETE" });
      onDelete(contact.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-sm">
      <div className="absolute inset-y-0 right-0 flex" style={{ width: REVEAL_WIDTH }}>
        <button
          onClick={handleArchiveToggle}
          disabled={toggling}
          className="flex flex-col items-center justify-center gap-1 flex-1 text-white text-xs font-semibold disabled:opacity-60 active:opacity-80"
          style={{ backgroundColor: isArchived ? "#16a34a" : "#64748b" }}>
          {toggling ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : isArchived ? (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Unarchive
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8m-9 4v4m4-4v4" />
              </svg>
              Archive
            </>
          )}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex flex-col items-center justify-center gap-1 bg-red-500 text-white text-xs font-semibold disabled:opacity-60 active:opacity-80"
          style={{ width: 72 }}>
          {deleting ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </>
          )}
        </button>
      </div>

      <div
        ref={cardRef}
        className={`relative ${isArchived ? "bg-gray-50" : "bg-white"}`}
        style={{
          transform: `translateX(${offset}px)`,
          transition: snap ? "transform 0.22s cubic-bezier(0.25,0.46,0.45,0.94)" : "none",
          willChange: "transform",
        }}>

        <div className="p-4">
          <button onClick={handleCardTap} className="flex items-start gap-3 w-full text-left">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: isArchived ? "#94a3b8" : "#1B3A6B" }}>
              {contact.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-bold leading-snug ${isArchived ? "text-gray-400" : "text-slate-800"}`}>
                  {contact.name}
                </p>
                {isArchived && (
                  <span className="text-[10px] bg-gray-200 text-gray-500 rounded-full px-2 py-0.5 font-medium shrink-0">Archived</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {contact.trade && tradeColor && (
                  <span className={`text-xs rounded-full px-2 py-0.5 font-semibold ${isArchived ? "bg-gray-100 text-gray-400" : tradeColor}`}>
                    {contact.trade}
                  </span>
                )}
                {contact.company && <span className="text-xs text-gray-400">{contact.company}</span>}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              {contact.phone && !isArchived && (
                <a href={`tel:${contact.phone}`}
                  onClick={e => e.stopPropagation()}
                  className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 text-sm">
                  📞
                </a>
              )}
              <svg className={`w-4 h-4 text-gray-300 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-[#1B3A6B] font-semibold">
                  📞 {contact.phone}
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-[#1B3A6B]">
                  ✉️ {contact.email}
                </a>
              )}
              {contact.notes && <p className="text-xs text-gray-500 italic">{contact.notes}</p>}
              {!isArchived && (
                <button onClick={handleShare}
                  className="flex items-center gap-2 text-sm font-semibold rounded-xl px-3 py-2 w-full"
                  style={{ backgroundColor: shared ? "#22C55E" : "#F0F4FF", color: shared ? "white" : "#1B3A6B" }}>
                  {shared ? "✓ Shared!" : "📤 Share this contact"}
                </button>
              )}
              <p className="text-[11px] text-gray-300 text-center pt-1">← Swipe left for archive / delete</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TradeContactsClient({ initialContacts }: { initialContacts: TradeContact[] }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [mode, setMode] = useState<Mode>("idle");
  const [prefilled, setPrefilled] = useState<ContactFormValues>(EMPTY);
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);

  const isSearching = q.trim().length > 0;

  const active = contacts.filter(c => !c.archived);
  const archived = contacts.filter(c => c.archived === true);

  const searchResults = isSearching
    ? contacts.filter(c =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        (c.trade ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (c.company ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (c.phone ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
        (c.email ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (c.notes ?? "").toLowerCase().includes(q.toLowerCase())
      )
    : null;

  function handleScanned(data: CardScanResult) {
    const matchedTrade = TRADES.find(t => data.trade.toLowerCase().includes(t.toLowerCase())) ?? "";
    setPrefilled({
      name: data.name, company: data.company, trade: matchedTrade,
      phone: data.phone, email: data.email,
      notes: [data.website, data.address].filter(Boolean).join(" · "),
    });
    setMode("manual");
  }

  function handleCreated(contact: TradeContact) {
    setContacts(prev => [contact, ...prev]);
    setMode("idle");
    setPrefilled(EMPTY);
  }

  function reset() { setMode("idle"); setPrefilled(EMPTY); }

  function handleArchiveToggle(id: string, nowArchived: boolean) {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, archived: nowArchived } : c));
  }

  function handleDelete(id: string) {
    setContacts(prev => prev.filter(c => c.id !== id));
  }

  const sharedCardProps = {
    onDelete: handleDelete,
    onArchiveToggle: handleArchiveToggle,
    openId: openSwipeId,
    setOpenId: setOpenSwipeId,
  };

  return (
    <div className="space-y-3">
      <button onClick={() => setMode("choosing")}
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white font-semibold"
        style={{ backgroundColor: "#1B3A6B" }}>
        <span className="text-lg">+</span> Add Contact
      </button>

      {mode === "choosing" && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-[#1B3A6B]">Add New Contact</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setPrefilled(EMPTY); setMode("manual"); }}
              className="flex flex-col items-center gap-2 bg-white rounded-xl py-4 px-3 shadow-sm active:bg-gray-50 border border-gray-100">
              <svg className="w-6 h-6 text-[#1B3A6B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-xs font-semibold text-slate-700">Manual Entry</span>
            </button>
            <button type="button" onClick={() => setMode("scanning")}
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
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-sm font-bold text-[#1B3A6B] mb-3">Scan Business Card</p>
          <BusinessCardScanner onExtracted={handleScanned} onCancel={reset} />
        </div>
      )}

      {mode === "manual" && (
        <NewContactForm initial={prefilled} onCreated={handleCreated} onCancel={reset} onScanInstead={() => setMode("scanning")} />
      )}

      <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input className="flex-1 text-sm outline-none bg-transparent" placeholder="Search contacts (includes archived)"
          value={q} onChange={e => setQ(e.target.value)} />
        {q && (
          <button onClick={() => setQ("")} className="text-gray-300 hover:text-gray-500 text-sm leading-none">✕</button>
        )}
      </div>

      {isSearching ? (
        <>
          {searchResults!.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
              No contacts matching &ldquo;{q}&rdquo;
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults!.map(c => <ContactCard key={c.id} contact={c} {...sharedCardProps} />)}
              <p className="text-xs text-center text-gray-400 pt-1">
                {searchResults!.length} result{searchResults!.length !== 1 ? "s" : ""} — including archived
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          {active.length === 0 && mode === "idle" && (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
              No contacts yet. Tap Add Contact to get started.
            </div>
          )}
          <div className="space-y-2">
            {active.map(c => <ContactCard key={c.id} contact={c} {...sharedCardProps} />)}
          </div>

          {archived.length > 0 && (
            <div className="pt-1">
              <button onClick={() => setShowArchived(v => !v)}
                className="flex items-center gap-2 text-xs font-semibold text-gray-400 w-full px-1 py-2">
                <svg className={`w-3.5 h-3.5 transition-transform ${showArchived ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                {showArchived ? "Hide" : "Show"} archived ({archived.length})
              </button>
              {showArchived && (
                <div className="space-y-2 mt-1">
                  {archived.map(c => <ContactCard key={c.id} contact={c} {...sharedCardProps} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
