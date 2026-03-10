"use client";

import { useState, useRef } from "react";

type ReceiptItem = { description: string; quantity: number; unit_price: number; total: number };
type ReceiptItemWithMeta = ReceiptItem & {
  selected: boolean;
  inventory_match_id: string | null;
  inventory_match_name: string | null;
};
type ReceiptData = {
  vendor: string;
  date: string;
  subtotal: number;
  tax: number;
  total: number;
  items: ReceiptItemWithMeta[];
};
type Expense = {
  id: string;
  vendor: string;
  receipt_date: string | null;
  total_amount: number;
  job_id: string | null;
  created_at: string;
  line_items: ReceiptItem[] | null;
};
type Job = { id: string; job_title: string; customer_name: string; scheduled_date: string | null };
type InventoryItem = { id: string; name: string; sku: string | null; category: string | null; quantity: number; unit_cost: number };
type Mode = "list" | "capture" | "extracting" | "review" | "pick_job" | "pick_inventory";

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fmt(n: number) {
  return `$${Number(n).toFixed(2)}`;
}

export default function ReceiptsClient({
  initialExpenses,
  jobs,
  inventoryItems,
}: {
  initialExpenses: Expense[];
  jobs: Job[];
  inventoryItems: InventoryItem[];
}) {
  const [mode, setMode] = useState<Mode>("list");
  const [expenses, setExpenses] = useState(initialExpenses);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function suggestMatch(desc: string): { id: string; name: string } | null {
    const d = desc.toLowerCase();
    const match = inventoryItems.find(item => {
      const n = item.name.toLowerCase();
      return n.includes(d) || d.includes(n);
    });
    return match ? { id: match.id, name: match.name } : null;
  }

  function reset() {
    setMode("list");
    setReceipt(null);
    setError("");
    setSaving(false);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMode("extracting");
    setError("");
    try {
      const dataUrl = await readAsDataURL(file);
      const res = await fetch("/api/ai/receipt-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_data_url: dataUrl }),
      });
      const json = await res.json() as ReceiptData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Scan failed");
      setReceipt({
        ...json,
        items: (json.items ?? []).map(item => {
          const match = suggestMatch(item.description);
          return {
            ...item,
            selected: true,
            inventory_match_id: match?.id ?? null,
            inventory_match_name: match?.name ?? null,
          };
        }),
      });
      setMode("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
      setMode("capture");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function postExpense(jobId?: string | null): Promise<string | null> {
    if (!receipt) return null;
    const res = await fetch("/app/receipts/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendor: receipt.vendor,
        receipt_date: receipt.date || null,
        subtotal: receipt.subtotal,
        tax_amount: receipt.tax,
        total_amount: receipt.total,
        job_id: jobId ?? null,
        line_items: receipt.items.map(({ selected: _s, inventory_match_id: _mi, inventory_match_name: _mn, ...item }) => item),
      }),
    });
    const json = await res.json() as { id?: string; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Save failed");
    setExpenses(prev => [{
      id: json.id ?? "",
      vendor: receipt.vendor,
      receipt_date: receipt.date || null,
      total_amount: receipt.total,
      job_id: jobId ?? null,
      created_at: new Date().toISOString(),
      line_items: receipt.items.map(({ selected: _s, inventory_match_id: _mi, inventory_match_name: _mn, ...item }) => item),
    }, ...prev]);
    return json.id ?? null;
  }

  async function handleSaveExpense() {
    setSaving(true);
    setError("");
    try {
      await postExpense(null);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  async function handleJobSelected(jobId: string) {
    setSaving(true);
    setError("");
    try {
      await postExpense(jobId);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  async function handleInventoryConfirm() {
    if (!receipt) return;
    setSaving(true);
    setError("");
    try {
      const selected = receipt.items.filter(i => i.selected);
      for (const item of selected) {
        if (item.inventory_match_id) {
          const existing = inventoryItems.find(i => i.id === item.inventory_match_id);
          await fetch(`/app/inventory/api/${item.inventory_match_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: (existing?.quantity ?? 0) + item.quantity }),
          });
        } else {
          await fetch("/app/inventory/api", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: item.description,
              quantity: item.quantity,
              unit_cost: item.unit_price,
            }),
          });
        }
      }
      await postExpense(null);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inventory update failed");
      setSaving(false);
    }
  }

  function updateReceiptField(field: keyof Omit<ReceiptData, "items">, value: string | number) {
    setReceipt(prev => prev ? { ...prev, [field]: value } : prev);
  }

  function updateItem(idx: number, field: keyof ReceiptItem, value: string | number) {
    setReceipt(prev => {
      if (!prev) return prev;
      const items = prev.items.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, [field]: value };
        updated.total = updated.quantity * updated.unit_price;
        return updated;
      });
      return { ...prev, items };
    });
  }

  function toggleItem(idx: number) {
    setReceipt(prev => {
      if (!prev) return prev;
      const items = prev.items.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it);
      return { ...prev, items };
    });
  }

  if (mode === "extracting") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#1B3A6B] border-t-transparent animate-spin" />
        <p className="text-sm font-semibold text-[#1B3A6B]">Reading receipt…</p>
        <p className="text-xs text-gray-400">Usually takes 5–10 seconds</p>
      </div>
    );
  }

  if (mode === "capture") {
    return (
      <div className="space-y-3">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3">{error}</div>
        )}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <p className="text-sm font-bold text-[#1B3A6B]">Scan a Receipt</p>
          <p className="text-xs text-gray-500">Take a photo or upload an image of a supply or materials receipt. The AI will extract line items, totals, and vendor info.</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-blue-200 rounded-2xl py-12 flex flex-col items-center gap-3 bg-blue-50 active:bg-blue-100">
            <span className="text-5xl">🧾</span>
            <div className="text-center">
              <p className="text-sm font-bold text-[#1B3A6B]">Take Photo or Upload Image</p>
              <p className="text-xs text-gray-400 mt-1">Supports JPG, PNG, HEIC, screenshots</p>
            </div>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
          <button type="button" onClick={reset} className="w-full text-sm text-gray-400 py-2">Cancel</button>
        </div>
      </div>
    );
  }

  if (mode === "review" && receipt) {
    return (
      <div className="space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-sm font-bold text-[#1B3A6B]">Review Extracted Data</p>
          <p className="text-xs text-gray-400">Verify and edit before saving. Nothing is saved until you tap a button below.</p>

          <div className="space-y-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-0.5 block">Vendor</label>
              <input
                value={receipt.vendor}
                onChange={e => updateReceiptField("vendor", e.target.value)}
                placeholder="Vendor / Store name"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-0.5 block">Date</label>
              <input
                type="date"
                value={receipt.date}
                onChange={e => updateReceiptField("date", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-0.5 block">Subtotal</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={receipt.subtotal}
                  onChange={e => updateReceiptField("subtotal", Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-0.5 block">Tax</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={receipt.tax}
                  onChange={e => updateReceiptField("tax", Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-0.5 block">Total</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={receipt.total}
                  onChange={e => updateReceiptField("total", Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {receipt.items.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
            <p className="text-sm font-bold text-[#1B3A6B]">Line Items ({receipt.items.length})</p>
            {receipt.items.map((item, idx) => (
              <div key={idx} className="border border-gray-100 rounded-xl p-3 space-y-2">
                <input
                  value={item.description}
                  onChange={e => updateItem(idx, "description", e.target.value)}
                  placeholder="Description"
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400">Qty</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={e => updateItem(idx, "quantity", Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Unit $</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={e => updateItem(idx, "unit_price", Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Total</label>
                    <p className="text-sm font-bold text-slate-700 px-2 py-1.5">{fmt(item.total)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3">{error}</div>}

        <div className="space-y-2">
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveExpense}
            className="w-full rounded-xl py-3 text-white font-semibold disabled:opacity-60"
            style={{ backgroundColor: "#1B3A6B" }}>
            {saving ? "Saving…" : "Save as Expense"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => setMode("pick_job")}
            className="w-full rounded-xl py-3 font-semibold border-2 border-[#1B3A6B] text-[#1B3A6B] bg-white disabled:opacity-60">
            Attach to Job
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => setMode("pick_inventory")}
            className="w-full rounded-xl py-3 font-semibold border border-gray-200 bg-white text-slate-700 disabled:opacity-60">
            Add Items to Inventory
          </button>
          <button type="button" onClick={reset} disabled={saving} className="w-full text-sm text-gray-400 py-2">Cancel</button>
        </div>
      </div>
    );
  }

  if (mode === "pick_job" && receipt) {
    return (
      <div className="space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-sm font-bold text-[#1B3A6B]">Attach to Job</p>
          <p className="text-xs text-gray-400">Select a job to link this receipt to for job costing.</p>
          <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 flex justify-between">
            <span className="font-semibold">{receipt.vendor || "Receipt"}</span>
            <span className="font-bold text-slate-700">{fmt(receipt.total)}</span>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3">{error}</div>}

        {jobs.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
            No active jobs found. Save as an expense instead.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
            {jobs.map(job => (
              <button
                key={job.id}
                type="button"
                disabled={saving}
                onClick={() => handleJobSelected(job.id)}
                className="w-full flex items-start justify-between px-4 py-3 text-left active:bg-blue-50 disabled:opacity-60">
                <div>
                  <p className="text-sm font-bold text-slate-800">{job.job_title}</p>
                  {job.customer_name && <p className="text-xs text-gray-500">{job.customer_name}</p>}
                </div>
                {job.scheduled_date && (
                  <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                    {new Date(job.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <button type="button" onClick={() => setMode("review")} disabled={saving} className="w-full text-sm text-gray-400 py-2">
          ← Back to Review
        </button>
      </div>
    );
  }

  if (mode === "pick_inventory" && receipt) {
    const selected = receipt.items.filter(i => i.selected);
    return (
      <div className="space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
          <p className="text-sm font-bold text-[#1B3A6B]">Add Items to Inventory</p>
          <p className="text-xs text-gray-400">Select which items to add. Matched items will update existing stock quantities — new items will be created. Nothing changes until you confirm.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {receipt.items.map((item, idx) => (
            <div key={idx} className="px-4 py-3 flex items-start gap-3">
              <button
                type="button"
                onClick={() => toggleItem(idx)}
                className={`shrink-0 w-5 h-5 rounded border-2 mt-0.5 flex items-center justify-center ${
                  item.selected ? "bg-[#1B3A6B] border-[#1B3A6B]" : "border-gray-300 bg-white"
                }`}>
                {item.selected && <span className="text-white text-xs leading-none">✓</span>}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{item.description}</p>
                <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity} · {fmt(item.unit_price)} each</p>
                {item.inventory_match_name ? (
                  <span className="inline-block text-[10px] bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 mt-1">
                    Matches: {item.inventory_match_name}
                  </span>
                ) : (
                  <span className="inline-block text-[10px] bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5 mt-1">
                    New item
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {selected.length === 0 && (
          <div className="bg-amber-50 text-amber-700 text-sm rounded-xl p-3">
            Select at least one item to continue.
          </div>
        )}

        {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3">{error}</div>}

        <div className="space-y-2">
          <button
            type="button"
            disabled={saving || selected.length === 0}
            onClick={handleInventoryConfirm}
            className="w-full rounded-xl py-3 text-white font-semibold disabled:opacity-60"
            style={{ backgroundColor: "#1B3A6B" }}>
            {saving ? "Updating…" : `Confirm — Add ${selected.length} Item${selected.length !== 1 ? "s" : ""}`}
          </button>
          <button type="button" onClick={() => setMode("review")} disabled={saving} className="w-full text-sm text-gray-400 py-2">
            ← Back to Review
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setMode("capture")}
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white font-semibold"
        style={{ backgroundColor: "#1B3A6B" }}>
        <span>🧾</span> Scan Receipt
      </button>

      {expenses.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          <p className="text-3xl mb-3">🧾</p>
          <p className="font-semibold text-slate-700 mb-1">No receipts yet</p>
          <p className="text-sm text-gray-400">Tap Scan Receipt to photograph a supply receipt and track your material costs.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map(exp => (
            <div key={exp.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 truncate">{exp.vendor || "Unknown Vendor"}</p>
                  {exp.receipt_date && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(exp.receipt_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(exp.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-base font-bold text-slate-800">{fmt(exp.total_amount)}</p>
                  {exp.job_id && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium mt-1 inline-block">Job Attached</span>
                  )}
                </div>
              </div>
              {exp.line_items && exp.line_items.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">{exp.line_items.length} item{exp.line_items.length !== 1 ? "s" : ""}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
