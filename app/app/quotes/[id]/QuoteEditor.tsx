"use client";

import { useState } from "react";

type LineItem = {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type Props = {
  quoteId: string;
  initialTotal: number;
  initialItems: LineItem[];
  customerAddress?: string;
  customerPhone?: string;
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function QuoteEditor({
  quoteId,
  initialTotal,
  initialItems,
  customerAddress,
  customerPhone,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(initialTotal);
  const [items, setItems] = useState<LineItem[]>(initialItems);
  const [draft, setDraft] = useState<LineItem[]>(initialItems);

  const draftTotal = draft.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  function startEdit() {
    setDraft(items.map(i => ({ ...i })));
    setError("");
    setEditing(true);
  }

  function updateDraftItem(idx: number, field: keyof LineItem, value: string | number) {
    setDraft(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      updated.total_price = updated.quantity * updated.unit_price;
      return updated;
    }));
  }

  function addItem() {
    setDraft(prev => [...prev, { description: "", quantity: 1, unit_price: 0, total_price: 0 }]);
  }

  function removeItem(idx: number) {
    setDraft(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (draft.some(i => !i.description.trim())) {
      setError("All line items need a description.");
      return;
    }
    if (draft.some(i => i.unit_price <= 0)) {
      setError("All line items need a price greater than $0.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/app/quotes/api/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: draft.map(i => ({
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
        }),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        throw new Error(j.error ?? "Failed to save");
      }
      setItems(draft.map(i => ({ ...i, total_price: i.quantity * i.unit_price })));
      setTotal(draftTotal);
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
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-slate-800">Edit Line Items</p>
          <button type="button" onClick={() => setEditing(false)}
            className="text-xs text-gray-400 underline">Cancel</button>
        </div>

        {error && <p className="text-xs text-red-500 mb-3 font-medium">{error}</p>}

        <div className="space-y-3 mb-3">
          {draft.map((item, idx) => (
            <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  placeholder="Description *"
                  value={item.description}
                  onChange={e => updateDraftItem(idx, "description", e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                />
                {draft.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)}
                    className="text-red-400 text-lg leading-none px-1 flex-shrink-0">✕</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold mb-1 block">Qty</label>
                  <input
                    type="number" min="0.01" step="0.01"
                    value={item.quantity}
                    onChange={e => updateDraftItem(idx, "quantity", Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold mb-1 block">Unit Price ($)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={item.unit_price || ""}
                    placeholder="0.00"
                    onChange={e => updateDraftItem(idx, "unit_price", Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                  />
                </div>
              </div>
              <p className="text-xs text-right text-gray-500">
                Subtotal: ${fmt(item.quantity * item.unit_price)}
              </p>
            </div>
          ))}
        </div>

        <button type="button" onClick={addItem}
          className="text-sm font-medium text-[#1B3A6B] py-1 mb-3">
          + Add Line Item
        </button>

        <div className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3 mb-4">
          <span className="text-white text-sm font-semibold">New Total</span>
          <span className="text-white text-lg font-bold">${fmt(draftTotal)}</span>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing(false)}
            className="flex-1 rounded-xl py-2.5 border border-gray-200 text-sm font-semibold text-gray-500">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 rounded-xl py-2.5 text-white font-semibold text-sm disabled:opacity-60"
            style={{ backgroundColor: "#1B3A6B" }}>
            {saving ? "Saving…" : "Save Quote"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <p className="text-2xl font-bold text-slate-800">${fmt(total)}</p>
        <div className="flex items-center gap-2">
          {customerPhone && (
            <a href={`tel:${customerPhone}`} className="text-gray-400 text-lg">📞</a>
          )}
          <button
            onClick={startEdit}
            className="flex items-center gap-1 text-xs font-semibold text-[#1B3A6B] bg-blue-50 rounded-lg px-2.5 py-1.5">
            ✏️ Edit
          </button>
        </div>
      </div>

      {customerAddress && (
        <p className="text-sm text-gray-500 mb-3">{customerAddress}</p>
      )}

      {items.length > 0 ? (
        <div className="space-y-2 border-t pt-3">
          {items.map((item, idx) => (
            <div key={item.id ?? idx} className="flex justify-between text-sm">
              <span className="text-slate-700">{item.description} × {item.quantity}</span>
              <span className="font-medium">${fmt(item.total_price)}</span>
            </div>
          ))}
        </div>
      ) : (
        <button onClick={startEdit}
          className="text-sm text-gray-400 italic border-t pt-3 w-full text-left">
          No line items — tap Edit to add some
        </button>
      )}
    </div>
  );
}
