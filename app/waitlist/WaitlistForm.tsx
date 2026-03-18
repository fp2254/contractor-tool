"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

const TRADES = [
  "General Contractor", "Electrician", "Plumber", "HVAC", "Roofer", "Framer",
  "Drywaller", "Painter", "Landscaper", "Concrete / Masonry", "Flooring",
  "Tile", "Insulation", "Handyman", "Other",
];

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

export default function WaitlistForm() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") ?? "";

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    trade: "", company: "", state: "", pain_point: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-lg font-bold text-green-800 mb-2">You&apos;re on the list.</h2>
        <p className="text-sm text-green-700">We&apos;ll let you know when early access opens. Keep your phone handy.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">First Name *</label>
          <input
            required
            value={form.first_name}
            onChange={(e) => set("first_name", e.target.value)}
            placeholder="Mike"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Last Name *</label>
          <input
            required
            value={form.last_name}
            onChange={(e) => set("last_name", e.target.value)}
            placeholder="Johnson"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="mike@company.com"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Phone <span className="font-normal text-gray-400">(optional)</span></label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="(207) 555-0100"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Trade / Business Type *</label>
        <select
          required
          value={form.trade}
          onChange={(e) => set("trade", e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white">
          <option value="">Select your trade</option>
          {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Company Name <span className="font-normal text-gray-400">(optional)</span></label>
        <input
          value={form.company}
          onChange={(e) => set("company", e.target.value)}
          placeholder="Johnson Electric LLC"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">State *</label>
        <select
          required
          value={form.state}
          onChange={(e) => set("state", e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white">
          <option value="">Select your state</option>
          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Biggest business pain point <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          value={form.pain_point}
          onChange={(e) => set("pain_point", e.target.value)}
          placeholder="e.g. I lose track of invoices and never know who owes me money"
          rows={3}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl py-4 text-white font-bold text-base disabled:opacity-60 shadow-sm"
        style={{ backgroundColor: "#1B3A6B" }}>
        {submitting ? "Joining…" : "Join the Waitlist"}
      </button>

      <p className="text-xs text-center text-gray-400">
        No spam. No credit card. Just early access updates.
      </p>
    </form>
  );
}
