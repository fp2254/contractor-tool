"use client";

import { useState } from "react";

type Customer = {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

export function CustomerEditCard({ customer }: { customer: Customer }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(customer);
  const [form, setForm] = useState({
    first_name: customer.first_name ?? "",
    last_name: customer.last_name ?? "",
    company_name: customer.company_name ?? "",
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    address_line1: customer.address_line1 ?? "",
    city: customer.city ?? "",
    state: customer.state ?? "",
    zip: customer.zip ?? "",
  });

  const address = [data.address_line1, data.city, data.state, data.zip].filter(Boolean).join(", ");
  const mapsUrl = address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : null;

  function startEdit() {
    setForm({
      first_name: data.first_name ?? "",
      last_name: data.last_name ?? "",
      company_name: data.company_name ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      address_line1: data.address_line1 ?? "",
      city: data.city ?? "",
      state: data.state ?? "",
      zip: data.zip ?? "",
    });
    setError("");
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/app/customers/api/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json() as Customer & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      setData(json);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-[#1B3A6B]">Edit Client</p>
          <button type="button" onClick={() => setEditing(false)}
            className="text-xs text-gray-400 underline">Cancel</button>
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <form onSubmit={handleSave} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="First name *"
              value={form.first_name}
              onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            <input
              placeholder="Last name"
              value={form.last_name}
              onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <input
            placeholder="Company name"
            value={form.company_name}
            onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <input
            placeholder="Phone"
            type="tel"
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <input
            placeholder="Address"
            value={form.address_line1}
            onChange={e => setForm(p => ({ ...p, address_line1: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              placeholder="City"
              value={form.city}
              onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
              className="col-span-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            <input
              placeholder="State"
              maxLength={2}
              value={form.state}
              onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            <input
              placeholder="ZIP"
              value={form.zip}
              onChange={e => setForm(p => ({ ...p, zip: e.target.value }))}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setEditing(false)}
              className="flex-1 rounded-xl py-2.5 border border-gray-200 text-sm font-semibold text-gray-500">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-xl py-2.5 text-white font-semibold text-sm disabled:opacity-60"
              style={{ backgroundColor: "#1B3A6B" }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact Info</p>
        <button
          onClick={startEdit}
          className="flex items-center gap-1 text-xs font-semibold text-[#1B3A6B] bg-blue-50 rounded-lg px-2.5 py-1.5">
          ✏️ Edit
        </button>
      </div>
      <div className="space-y-1.5">
        {data.phone ? (
          <a href={`tel:${data.phone}`} className="flex items-center gap-2 text-sm text-slate-700">
            📞 {data.phone}
          </a>
        ) : (
          <button onClick={startEdit} className="flex items-center gap-2 text-sm text-gray-400 italic">
            📞 Add phone number
          </button>
        )}
        {data.email ? (
          <a href={`mailto:${data.email}`} className="flex items-center gap-2 text-sm text-slate-700">
            ✉️ {data.email}
          </a>
        ) : (
          <button onClick={startEdit} className="flex items-center gap-2 text-sm text-gray-400 italic">
            ✉️ Add email
          </button>
        )}
        {address ? (
          mapsUrl ? (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-slate-700">
              📍 {address}
            </a>
          ) : (
            <p className="flex items-center gap-2 text-sm text-gray-500">📍 {address}</p>
          )
        ) : (
          <button onClick={startEdit} className="flex items-center gap-2 text-sm text-gray-400 italic">
            📍 Add address
          </button>
        )}
      </div>
    </div>
  );
}
