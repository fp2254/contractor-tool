"use client";

import { useState } from "react";

export type InventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  quantity: number;
  unit_cost: number;
  category: string | null;
  created_at: string;
};

const CATEGORIES = ["Materials", "Tools", "Parts", "Supplies", "Equipment", "Other"];

function NewItemForm({ onCreated, onCancel }: { onCreated: (item: InventoryItem) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/app/inventory/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sku, description, quantity, unit_cost: unitCost, category }),
      });
      const data = await res.json() as InventoryItem & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create item");
      onCreated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
      <p className="text-sm font-bold text-[#1B3A6B]">New Item</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          required
          placeholder="Item name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white">
            <option value="">Category</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Qty</label>
            <input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Unit Cost ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            />
          </div>
        </div>
        <input
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
        />
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl py-2.5 text-white font-semibold text-sm disabled:opacity-60"
            style={{ backgroundColor: "#1B3A6B" }}>
            {saving ? "Saving…" : "Add Item"}
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

function ItemCard({ item, onDelete, onQuantityChange }: {
  item: InventoryItem;
  onDelete: (id: string) => void;
  onQuantityChange: (id: string, qty: number) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [qty, setQty] = useState(item.quantity);
  const [saving, setSaving] = useState(false);

  async function adjustQty(delta: number) {
    const newQty = Math.max(0, qty + delta);
    setQty(newQty);
    setSaving(true);
    try {
      await fetch(`/app/inventory/api/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });
      onQuantityChange(item.id, newQty);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${item.name}"?`)) return;
    setDeleting(true);
    try {
      await fetch(`/app/inventory/api/${item.id}`, { method: "DELETE" });
      onDelete(item.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 leading-snug">{item.name}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {item.category && (
              <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{item.category}</span>
            )}
            {item.sku && (
              <span className="text-xs text-gray-400 font-mono">SKU: {item.sku}</span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-gray-400 mt-1 leading-snug">{item.description}</p>
          )}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-gray-300 hover:text-red-400 text-sm flex-shrink-0 p-1">
          {deleting ? "…" : "✕"}
        </button>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => adjustQty(-1)}
            disabled={saving || qty === 0}
            className="w-8 h-8 rounded-full bg-gray-100 text-slate-700 font-bold text-lg leading-none flex items-center justify-center disabled:opacity-40">
            −
          </button>
          <span className={`text-lg font-bold tabular-nums ${qty === 0 ? "text-red-500" : "text-slate-800"}`}>
            {qty}
          </span>
          <button
            onClick={() => adjustQty(1)}
            disabled={saving}
            className="w-8 h-8 rounded-full text-white font-bold text-lg leading-none flex items-center justify-center disabled:opacity-40"
            style={{ backgroundColor: "#1B3A6B" }}>
            +
          </button>
          <span className="text-xs text-gray-400">{saving ? "saving…" : "in stock"}</span>
        </div>
        {item.unit_cost > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Unit cost</p>
            <p className="text-sm font-bold text-slate-700">${Number(item.unit_cost).toFixed(2)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InventoryClient({ initialItems }: { initialItems: InventoryItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState("");

  const filtered = items.filter(
    (i) =>
      !q ||
      i.name.toLowerCase().includes(q.toLowerCase()) ||
      (i.sku ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (i.category ?? "").toLowerCase().includes(q.toLowerCase())
  );

  function handleCreated(item: InventoryItem) {
    setItems((prev) => [item, ...prev]);
    setShowForm(false);
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleQuantityChange(id: string, qty: number) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));
  }

  const totalValue = items.reduce((sum, i) => sum + i.quantity * Number(i.unit_cost), 0);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white font-semibold"
        style={{ backgroundColor: "#1B3A6B" }}>
        <span className="text-lg">+</span> New Item
      </button>

      {showForm && (
        <NewItemForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
      )}

      <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          className="flex-1 text-sm outline-none bg-transparent"
          placeholder="Search items"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {items.length > 0 && (
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
          <p className="text-xs text-gray-500">{items.length} items</p>
          <p className="text-sm font-bold text-[#1B3A6B]">
            Total value: ${totalValue.toFixed(2)}
          </p>
        </div>
      )}

      {filtered.length === 0 && !showForm && (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
          {q ? `No items matching "${q}"` : "No items yet. Tap New Item to add your first."}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onDelete={handleDelete}
            onQuantityChange={handleQuantityChange}
          />
        ))}
      </div>
    </div>
  );
}
