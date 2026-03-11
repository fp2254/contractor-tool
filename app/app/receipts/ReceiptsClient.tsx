"use client";

import { useState, useRef } from "react";

type ReceiptItem = { description: string; quantity: number; unit_price: number; total: number };
type ReceiptItemWithMeta = ReceiptItem & {
  forInventory: boolean;
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
type InventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  quantity: number;
  unit_cost: number;
};
type Mode = "list" | "capture" | "extracting" | "review";

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

function Checkbox({ checked, onChange, label, sublabel }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 w-full text-left py-1">
      <span className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
        checked ? "bg-[#1B3A6B] border-[#1B3A6B]" : "border-gray-300 bg-white"
      }`}>
        {checked && <span className="text-white text-[10px] leading-none font-bold">✓</span>}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
    </button>
  );
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

  const [attachToJob, setAttachToJob] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [addToInventory, setAddToInventory] = useState(false);

  function suggestMatch(desc: string): { id: string; name: string } | null {
    const d = desc.toLowerCase().trim();
    if (!d) return null;
    const words = d.split(/\s+/).filter(w => w.length > 2);
    const match = inventoryItems.find(item => {
      const n = item.name.toLowerCase();
      return n === d || words.some(w => n.includes(w));
    });
    return match ? { id: match.id, name: match.name } : null;
  }

  function reset() {
    setMode("list");
    setReceipt(null);
    setError("");
    setSaving(false);
    setAttachToJob(false);
    setSelectedJobId("");
    setAddToInventory(false);
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
            forInventory: true,
            inventory_match_id: match?.id ?? null,
            inventory_match_name: match?.name ?? null,
          };
        }),
      });
      setMode("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed — please try again");
      setMode("capture");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function updateReceiptField(field: keyof Omit<ReceiptData, "items">, value: string | number) {
    setReceipt(prev => prev ? { ...prev, [field]: value } : prev);
  }

  function updateItem(idx: number, field: keyof ReceiptItem, value: string | number) {
    setReceipt(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it, i) => {
          if (i !== idx) return it;
          const updated = { ...it, [field]: value };
          updated.total = Number(updated.quantity) * Number(updated.unit_price);
          return updated;
        }),
      };
    });
  }

  function toggleInventory(idx: number) {
    setReceipt(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it, i) =>
          i === idx ? { ...it, forInventory: !it.forInventory } : it
        ),
      };
    });
  }

  async function handleSave() {
    if (!receipt) return;
    if (attachToJob && !selectedJobId) {
      setError("Please select a job to attach this receipt to.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const jobId = attachToJob ? selectedJobId : null;
      const res = await fetch("/app/receipts/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: receipt.vendor,
          receipt_date: receipt.date || null,
          subtotal: receipt.subtotal,
          tax_amount: receipt.tax,
          total_amount: receipt.total,
          job_id: jobId || null,
          line_items: receipt.items.map(({ forInventory: _fi, inventory_match_id: _mi, inventory_match_name: _mn, ...item }) => item),
        }),
      });
      const json = await res.json() as { id?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not save receipt");

      setExpenses(prev => [{
        id: json.id ?? "",
        vendor: receipt.vendor,
        receipt_date: receipt.date || null,
        total_amount: receipt.total,
        job_id: jobId || null,
        created_at: new Date().toISOString(),
        line_items: receipt.items.map(({ forInventory: _fi, inventory_match_id: _mi, inventory_match_name: _mn, ...item }) => item),
      }, ...prev]);

      if (addToInventory) {
        const toAdd = receipt.items.filter(i => i.forInventory);
        for (const item of toAdd) {
          if (item.inventory_match_id) {
            const existing = inventoryItems.find(i => i.id === item.inventory_match_id);
            await fetch(`/app/inventory/api/${item.inventory_match_id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                quantity: (existing?.quantity ?? 0) + Number(item.quantity),
                unit_cost: item.unit_price > 0 ? item.unit_price : (existing?.unit_cost ?? 0),
              }),
            });
          } else {
            await fetch("/app/inventory/api", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: item.description,
                quantity: item.quantity,
                unit_cost: item.unit_price,
                description: `Added from ${receipt.vendor || "receipt"} on ${receipt.date || new Date().toISOString().slice(0, 10)}`,
              }),
            });
          }
        }
      }

      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
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
        {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3">{error}</div>}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <p className="text-sm font-bold text-[#1B3A6B]">Scan a Receipt</p>
          <p className="text-xs text-gray-500">Take a photo or upload an image of a supply or materials receipt. The AI will extract line items, totals, and vendor info.</p>
          <label className="relative w-full border-2 border-dashed border-blue-200 rounded-2xl py-12 flex flex-col items-center gap-3 bg-blue-50 active:bg-blue-100 cursor-pointer select-none overflow-hidden">
            <span className="text-5xl">🧾</span>
            <div className="text-center">
              <p className="text-sm font-bold text-[#1B3A6B]">Take Photo or Upload Image</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, HEIC, screenshots</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFile}
            />
          </label>
          <button type="button" onClick={reset} className="w-full text-sm text-gray-400 py-2">Cancel</button>
        </div>
      </div>
    );
  }

  if (mode === "review" && receipt) {
    const inventoryCount = receipt.items.filter(i => i.forInventory).length;

    return (
      <div className="space-y-3 pb-6">
        {/* Receipt header info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#1B3A6B]">Review Receipt</p>
            <span className="text-xs text-gray-400">Edit before saving</span>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-0.5">Vendor / Store</label>
              <input
                value={receipt.vendor}
                onChange={e => updateReceiptField("vendor", e.target.value)}
                placeholder="Vendor name"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-0.5">Date</label>
              <input
                type="date"
                value={receipt.date}
                onChange={e => updateReceiptField("date", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-0.5">Subtotal</label>
                <input
                  type="number" step="0.01" min="0"
                  value={receipt.subtotal}
                  onChange={e => updateReceiptField("subtotal", Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-0.5">Tax</label>
                <input
                  type="number" step="0.01" min="0"
                  value={receipt.tax}
                  onChange={e => updateReceiptField("tax", Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-0.5">Total</label>
                <input
                  type="number" step="0.01" min="0"
                  value={receipt.total}
                  onChange={e => updateReceiptField("total", Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-2 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Line items */}
        {receipt.items.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-bold text-[#1B3A6B]">Line Items</p>
              {addToInventory && (
                <p className="text-xs text-gray-400">Check to add to inventory</p>
              )}
            </div>
            {receipt.items.map((item, idx) => (
              <div key={idx} className="border border-gray-100 rounded-xl overflow-hidden">
                {/* Item row */}
                <div className="flex items-start gap-2 p-3">
                  {addToInventory && (
                    <button
                      type="button"
                      onClick={() => toggleInventory(idx)}
                      className={`shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        item.forInventory
                          ? "bg-[#1B3A6B] border-[#1B3A6B]"
                          : "border-gray-300 bg-white"
                      }`}>
                      {item.forInventory && <span className="text-white text-[10px] leading-none font-bold">✓</span>}
                    </button>
                  )}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <input
                      value={item.description}
                      onChange={e => updateItem(idx, "description", e.target.value)}
                      placeholder="Item description"
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <p className="text-[10px] text-gray-400 mb-0.5">Qty</p>
                        <input
                          type="number" min="0" step="0.01"
                          value={item.quantity}
                          onChange={e => updateItem(idx, "quantity", Number(e.target.value))}
                          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 mb-0.5">Unit $</p>
                        <input
                          type="number" min="0" step="0.01"
                          value={item.unit_price}
                          onChange={e => updateItem(idx, "unit_price", Number(e.target.value))}
                          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 mb-0.5">Total</p>
                        <p className="text-sm font-bold text-slate-700 px-2 py-1.5">{fmt(item.total)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Inventory match badge */}
                {addToInventory && item.forInventory && (
                  <div className={`px-3 py-1.5 border-t ${item.inventory_match_id ? "bg-green-50 border-green-100" : "bg-blue-50 border-blue-100"}`}>
                    {item.inventory_match_id ? (
                      <p className="text-[11px] text-green-700">
                        ↑ Updates existing: <span className="font-semibold">{item.inventory_match_name}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-blue-600">+ Creates new inventory item</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Save options */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Save Options</p>

          {/* Save as expense — always on */}
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 w-5 h-5 rounded border-2 bg-[#1B3A6B] border-[#1B3A6B] flex items-center justify-center">
              <span className="text-white text-[10px] leading-none font-bold">✓</span>
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-700">Save as Expense</p>
              <p className="text-xs text-gray-400 mt-0.5">Always saved — appears in Expenses &amp; Reports</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-3">
            {/* Attach to job */}
            <Checkbox
              checked={attachToJob}
              onChange={setAttachToJob}
              label="Attach to Job"
              sublabel="Links receipt to a job for cost tracking"
            />
            {attachToJob && (
              <div className="ml-8">
                {jobs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No active jobs found.</p>
                ) : (
                  <select
                    value={selectedJobId}
                    onChange={e => setSelectedJobId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white">
                    <option value="">Select a job…</option>
                    {jobs.map(job => (
                      <option key={job.id} value={job.id}>
                        {job.job_title}{job.customer_name ? ` — ${job.customer_name}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Add to inventory */}
            <Checkbox
              checked={addToInventory}
              onChange={v => {
                setAddToInventory(v);
              }}
              label="Add selected items to Inventory"
              sublabel="Check items above to include them"
            />
            {addToInventory && (
              <div className="ml-8">
                {inventoryCount === 0 ? (
                  <p className="text-xs text-amber-600">No items selected above — check the items you want to add.</p>
                ) : (
                  <p className="text-xs text-[#1B3A6B] font-medium">{inventoryCount} item{inventoryCount !== 1 ? "s" : ""} will be added / updated</p>
                )}
              </div>
            )}
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3">{error}</div>}

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="w-full rounded-xl py-3.5 text-white font-semibold text-base disabled:opacity-60"
          style={{ backgroundColor: "#1B3A6B" }}>
          {saving ? "Saving…" : "Save Receipt"}
        </button>
        <button type="button" onClick={reset} disabled={saving} className="w-full text-sm text-gray-400 py-2">
          Cancel
        </button>
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
          <p className="text-sm text-gray-400">Photograph a supply receipt to track material costs, attach to jobs, and update inventory.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map(exp => (
            <div key={exp.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 truncate">{exp.vendor || "Unknown Vendor"}</p>
                  {exp.receipt_date ? (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(exp.receipt_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(exp.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-base font-bold text-slate-800">{fmt(exp.total_amount)}</p>
                  {exp.job_id && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium mt-1 inline-block">
                      Job Attached
                    </span>
                  )}
                </div>
              </div>
              {exp.line_items && exp.line_items.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  {exp.line_items.length} item{exp.line_items.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
