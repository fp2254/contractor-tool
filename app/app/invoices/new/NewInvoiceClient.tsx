"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { WarrantySection } from "@/components/WarrantySection";

type Item = { description: string; quantity: number; unit_price: number };

type NewCustomer = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
};

const EMPTY_NC: NewCustomer = { first_name: "", last_name: "", phone: "", email: "" };

export default function NewInvoiceClient({ customers }: { customers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "__new__");
  const [newCustomer, setNewCustomer] = useState<NewCustomer>(EMPTY_NC);
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [notes, setNotes] = useState("");
  const [warrantyText, setWarrantyText] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isNew = customerId === "__new__";

  const total = useMemo(
    () => items.reduce((acc, i) => acc + i.quantity * i.unit_price, 0),
    [items]
  );

  function updateItem(i: number, field: keyof Item, value: string | number) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isNew && !customerId) { setError("Please select a client."); return; }
    if (isNew && !newCustomer.first_name.trim()) { setError("Client first name is required."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: isNew ? "" : customerId,
          items,
          notes: [notes.trim(), warrantyText.trim()].filter(Boolean).join("\n\n"),
          due_date: dueDate,
          ...(isNew ? { new_customer: newCustomer } : {}),
        }),
      });
      const json = await res.json() as { id?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to create invoice");
      router.push(`/app/invoices/${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
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
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100">
          <option value="__new__">+ New Client</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Inline new client form */}
      {isNew && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-[#1B3A6B]">New Client Details</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="First name *"
              required
              value={newCustomer.first_name}
              onChange={(e) => setNewCustomer(p => ({ ...p, first_name: e.target.value }))}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            />
            <input
              placeholder="Last name"
              value={newCustomer.last_name}
              onChange={(e) => setNewCustomer(p => ({ ...p, last_name: e.target.value }))}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            />
          </div>
          <input
            placeholder="Phone"
            type="tel"
            value={newCustomer.phone}
            onChange={(e) => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          />
          <input
            placeholder="Email"
            type="email"
            value={newCustomer.email}
            onChange={(e) => setNewCustomer(p => ({ ...p, email: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          />
        </div>
      )}

      {/* Due Date */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

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
                  <button type="button" onClick={() => removeItem(i)} className="text-red-400 text-lg px-1">✕</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number" min="0" step="0.1" placeholder="Qty" required
                  value={item.quantity}
                  onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                />
                <input
                  type="number" min="0" step="0.01" placeholder="Unit price ($)" required
                  value={item.unit_price}
                  onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                />
              </div>
              <p className="text-xs text-right text-gray-400">
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

      {/* Terms & Warranty */}
      <WarrantySection value={warrantyText} onChange={setWarrantyText} />

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Notes</label>
        <textarea
          placeholder="Invoice notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Total */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
        <span className="text-sm font-semibold text-slate-700">Total</span>
        <span className="text-lg font-bold text-[#1B3A6B]">${total.toFixed(2)}</span>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl py-3 text-white font-semibold disabled:opacity-60"
        style={{ backgroundColor: "#1B3A6B" }}>
        {submitting ? "Creating…" : "Create Invoice"}
      </button>
    </form>
  );
}
