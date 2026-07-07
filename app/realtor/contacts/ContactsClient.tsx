"use client";

import { useState } from "react";
import { Users, Plus, Trash2, X, Phone, Mail, Building2 } from "lucide-react";

type Contact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
};

const EMPTY_FORM = { name: "", phone: "", email: "", company: "", notes: "" };

export default function ContactsClient({
  contacts: initial,
  migrationPending,
}: {
  contacts: Contact[];
  migrationPending: boolean;
}) {
  const [contacts, setContacts] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q)
    );
  });

  async function addContact() {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/realtor/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok && data.contact) {
      setContacts((prev) => [data.contact, ...prev]);
      setShowForm(false);
      setForm(EMPTY_FORM);
    }
  }

  async function deleteContact(id: string) {
    setDeletingId(id);
    await fetch(`/api/realtor/contacts/${id}`, { method: "DELETE" });
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">Private list of clients you intend to refer to contractors.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0"
          style={{ backgroundColor: "#1B3A6B" }}
        >
          <Plus size={14} /> Add Contact
        </button>
      </div>

      {migrationPending && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <strong>Migration pending.</strong> Apply <code className="text-xs bg-amber-100 px-1 rounded">supabase/migration_realtor_connections.sql</code> to enable contacts.
        </div>
      )}

      {contacts.length > 4 && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      )}

      {filtered.length === 0 && !migrationPending ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">{search ? "No contacts match your search." : "No contacts yet."}</p>
          {!search && <p className="text-xs mt-1">Add clients you plan to refer to contractors.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 text-sm font-bold" style={{ backgroundColor: "#1B3A6B" }}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                {c.company && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Building2 size={10} /> {c.company}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
                      <Phone size={10} /> {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
                      <Mail size={10} /> {c.email}
                    </a>
                  )}
                </div>
                {c.notes && <p className="text-xs text-gray-400 mt-1 italic">{c.notes}</p>}
              </div>
              <button
                onClick={() => deleteContact(c.id)}
                disabled={deletingId === c.id}
                className="text-gray-300 hover:text-red-400 disabled:opacity-40 shrink-0 p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Add Contact</h2>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Phone"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="Email"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Company</label>
                <input
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  placeholder="Company or address"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Any notes…"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addContact}
                disabled={saving || !form.name.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                {saving ? "Saving…" : "Save Contact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
