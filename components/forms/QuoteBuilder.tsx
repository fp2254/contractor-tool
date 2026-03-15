"use client";

import { useMemo, useState } from "react";
import { WarrantySection } from "@/components/WarrantySection";

type Item = { description: string; quantity: number; unit_price: number };

export type NewCustomer = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
};

export type QuotePayload = {
  customer_id: string;
  notes: string;
  items: Item[];
  scope_items?: string[];
  estimated_time?: string;
  new_customer?: NewCustomer;
};

export type ServicePreset = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

export function QuoteBuilder({
  customers,
  presets = [],
  defaultWarrantyText = "",
  onSubmit,
}: {
  customers: { id: string; name: string }[];
  presets?: ServicePreset[];
  defaultWarrantyText?: string;
  onSubmit: (payload: QuotePayload) => Promise<void>;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "__new__");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([
    { description: "", quantity: 1, unit_price: 0 },
  ]);
  const [newCustomer, setNewCustomer] = useState<NewCustomer>({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
  });
  const [scopeItems, setScopeItems] = useState<string[]>([""]);
  const [estimatedTime, setEstimatedTime] = useState("");
  const [warrantyText, setWarrantyText] = useState(defaultWarrantyText);
  const [generatingScope, setGeneratingScope] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0),
    [items]
  );

  const isNew = customerId === "__new__";

  function addPreset(preset: ServicePreset) {
    setItems((prev) => {
      const empty = prev.find(i => !i.description.trim());
      if (empty) {
        return prev.map(i =>
          !i.description.trim()
            ? { description: preset.name, quantity: 1, unit_price: preset.price }
            : i
        );
      }
      return [...prev, { description: preset.name, quantity: 1, unit_price: preset.price }];
    });
  }

  function updateItem(i: number, field: keyof Item, value: string | number) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it))
    );
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateScope(i: number, value: string) {
    setScopeItems((prev) => prev.map((s, idx) => (idx === i ? value : s)));
  }

  function addScopeLine() {
    setScopeItems((prev) => [...prev, ""]);
  }

  function removeScope(i: number) {
    setScopeItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function generateScope() {
    const filled = items.filter(i => i.description.trim());
    if (!filled.length) return;
    setGeneratingScope(true);
    try {
      const res = await fetch("/api/ai/scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: filled }),
      });
      const json = await res.json() as { bullets?: string[] };
      if (json.bullets?.length) {
        setScopeItems(json.bullets);
      }
    } finally {
      setGeneratingScope(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanScope = scopeItems.filter(s => s.trim());
      const combinedNotes = [notes.trim(), warrantyText.trim()].filter(Boolean).join("\n\n");
      await onSubmit({
        customer_id: isNew ? "" : customerId,
        notes: combinedNotes,
        items,
        scope_items: cleanScope.length ? cleanScope : undefined,
        estimated_time: estimatedTime.trim() || undefined,
        ...(isNew ? { new_customer: newCustomer } : {}),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* Client selector */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Client</label>
        <select
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}>
          <option value="__new__">+ New Client</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {isNew && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-[#1B3A6B]">New Client Details</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="First name *"
              required
              value={newCustomer.first_name}
              onChange={(e) => setNewCustomer((p) => ({ ...p, first_name: e.target.value }))}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            />
            <input
              placeholder="Last name"
              value={newCustomer.last_name}
              onChange={(e) => setNewCustomer((p) => ({ ...p, last_name: e.target.value }))}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            />
          </div>
          <input
            placeholder="Phone"
            value={newCustomer.phone}
            onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          />
          <input
            placeholder="Email"
            type="email"
            value={newCustomer.email}
            onChange={(e) => setNewCustomer((p) => ({ ...p, email: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          />
        </div>
      )}

      {/* Quick-add service presets */}
      {presets.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Quick Add Services</label>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => addPreset(preset)}
                className="flex flex-col items-start rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left active:bg-blue-50 active:border-blue-200 transition-colors">
                <span className="text-xs font-semibold text-slate-700 leading-tight">{preset.name}</span>
                <span className="text-xs text-[#1B3A6B] font-bold mt-0.5">${preset.price.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Line Items */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Line Items</label>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  placeholder="Description *"
                  required
                  value={item.description}
                  onChange={(e) => updateItem(i, "description", e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                />
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)}
                    className="text-red-400 text-lg leading-none px-1">✕</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Qty"
                  required
                  value={item.quantity}
                  onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Unit price ($)"
                  required
                  value={item.unit_price}
                  onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                />
              </div>
              <p className="text-xs text-right text-gray-500">
                Subtotal: ${(item.quantity * item.unit_price).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }])}
          className="mt-2 text-sm font-medium text-[#1B3A6B] py-2">
          + Add Line Item
        </button>
      </div>

      {/* Scope of Work */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-slate-700">Scope of Work</label>
          <button
            type="button"
            onClick={generateScope}
            disabled={generatingScope || !items.some(i => i.description.trim())}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 disabled:opacity-40 active:bg-purple-100">
            {generatingScope ? (
              <span className="animate-pulse">Generating…</span>
            ) : (
              <>✨ AI Generate</>
            )}
          </button>
        </div>
        <div className="space-y-2">
          {scopeItems.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">•</span>
              <input
                placeholder={`Scope item ${i + 1} (e.g. Radon fan installation)`}
                value={s}
                onChange={(e) => updateScope(i, e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
              {scopeItems.length > 1 && (
                <button type="button" onClick={() => removeScope(i)}
                  className="text-red-400 text-base leading-none px-1">✕</button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addScopeLine}
          className="mt-2 text-sm font-medium text-[#1B3A6B] py-1">
          + Add Bullet
        </button>
      </div>

      {/* Estimated Time */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Estimated Install Time</label>
        <input
          placeholder="e.g. 3–5 hours, 1–2 days"
          value={estimatedTime}
          onChange={(e) => setEstimatedTime(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
        <p className="text-xs text-gray-400 mt-1">Shown to the customer on their quote</p>
      </div>

      {/* Terms & Warranty */}
      <WarrantySection value={warrantyText} onChange={setWarrantyText} />

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Notes</label>
        <textarea
          placeholder="Quote notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Total */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
        <span className="text-sm font-semibold text-slate-700">Total</span>
        <span className="text-lg font-bold text-[#1B3A6B]">${total.toFixed(2)}</span>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl py-3 text-white font-semibold disabled:opacity-60"
        style={{ backgroundColor: "#1B3A6B" }}>
        {submitting ? "Saving…" : "Save Quote"}
      </button>
    </form>
  );
}
