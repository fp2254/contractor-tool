"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  customerId: string;
  initialFirstName: string;
  initialLastName: string;
  initialPhone: string;
  initialAddress: string;
  initialCity: string;
  initialState: string;
  initialZip: string;
};

export function CustomerQuickEdit({
  customerId,
  initialFirstName,
  initialLastName,
  initialPhone,
  initialAddress,
  initialCity,
  initialState,
  initialZip,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState(initialAddress);
  const [city, setCity] = useState(initialCity);
  const [state, setState] = useState(initialState);
  const [zip, setZip] = useState(initialZip);

  function cancel() {
    setFirstName(initialFirstName);
    setLastName(initialLastName);
    setPhone(initialPhone);
    setAddress(initialAddress);
    setCity(initialCity);
    setState(initialState);
    setZip(initialZip);
    setError("");
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone,
          address_line1: address,
          city,
          state,
          zip,
        }),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        throw new Error(j.error ?? "Failed to save");
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || "—";
  const displayAddress = [address, city, state, zip].filter(Boolean).join(", ") || null;

  if (!editing) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</p>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs font-semibold text-[#1B3A6B] bg-blue-50 rounded-lg px-2.5 py-1.5"
          >
            ✏️ Edit
          </button>
        </div>
        <p className="text-sm font-bold text-slate-800">{displayName}</p>
        {phone && (
          <a href={`tel:${phone}`} className="text-sm text-blue-600 mt-0.5 block">
            {phone}
          </a>
        )}
        {displayAddress && (
          <p className="text-sm text-gray-500 mt-0.5">{displayAddress}</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Edit Customer</p>
        <button onClick={cancel} className="text-xs text-gray-400 underline">Cancel</button>
      </div>

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-400 uppercase font-semibold mb-1 block">First Name</label>
          <input
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="First name"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase font-semibold mb-1 block">Last Name</label>
          <input
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Last name"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-gray-400 uppercase font-semibold mb-1 block">Phone</label>
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Phone number"
          type="tel"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div>
        <label className="text-[10px] text-gray-400 uppercase font-semibold mb-1 block">Street Address</label>
        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="123 Main St"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <label className="text-[10px] text-gray-400 uppercase font-semibold mb-1 block">City</label>
          <input
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="City"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase font-semibold mb-1 block">State</label>
          <input
            value={state}
            onChange={e => setState(e.target.value)}
            placeholder="ME"
            maxLength={2}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 uppercase"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase font-semibold mb-1 block">Zip</label>
          <input
            value={zip}
            onChange={e => setZip(e.target.value)}
            placeholder="04101"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={cancel}
          className="flex-1 rounded-xl py-2.5 border border-gray-200 text-sm font-semibold text-gray-500"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-xl py-2.5 text-white font-semibold text-sm disabled:opacity-60"
          style={{ backgroundColor: "#1B3A6B" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Changes update the customer record and reflect everywhere — portal, PDFs, jobs.
      </p>
    </div>
  );
}
