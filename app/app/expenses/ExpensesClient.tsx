"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

type Expense = {
  id: string;
  vendor: string;
  description: string | null;
  receipt_date: string | null;
  total_amount: number;
  category: string | null;
  job_id: string | null;
  notes: string | null;
  created_at: string;
};

type Job = { id: string; job_title: string; customer_id: string };

const CATEGORIES: { value: string; label: string; emoji: string; color: string }[] = [
  { value: "materials",      label: "Materials",      emoji: "🏗️", color: "bg-blue-100 text-blue-700" },
  { value: "labor",          label: "Labor",          emoji: "👷", color: "bg-amber-100 text-amber-700" },
  { value: "fuel",           label: "Fuel",           emoji: "⛽", color: "bg-orange-100 text-orange-700" },
  { value: "tools",          label: "Tools",          emoji: "🔧", color: "bg-slate-100 text-slate-700" },
  { value: "permits",        label: "Permits",        emoji: "📋", color: "bg-purple-100 text-purple-700" },
  { value: "subcontractor",  label: "Subcontractor",  emoji: "🤝", color: "bg-teal-100 text-teal-700" },
  { value: "equipment",      label: "Equipment",      emoji: "🚜", color: "bg-yellow-100 text-yellow-700" },
  { value: "other",          label: "Other",          emoji: "📦", color: "bg-gray-100 text-gray-600" },
];

function catMeta(cat: string | null) {
  return CATEGORIES.find(c => c.value === (cat ?? "other")) ?? CATEGORIES[CATEGORIES.length - 1];
}

function parseNotesCategory(notes: string | null): { category: string; text: string } {
  if (!notes) return { category: "other", text: "" };
  const m = notes.match(/^\[(\w+)\]\s*(.*)/s);
  if (m) return { category: m[1] ?? "other", text: m[2] ?? "" };
  return { category: "other", text: notes };
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmt(n: number) {
  return `$${Number(n).toFixed(2)}`;
}

const TABS = ["All", "Materials", "Labor", "Fuel", "Tools", "Other"] as const;
type Tab = typeof TABS[number];

export default function ExpensesClient({
  initialExpenses,
  jobs,
}: {
  initialExpenses: Expense[];
  jobs: Job[];
}) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Add form state
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("materials");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [jobId, setJobId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Enrich display category — handle both new column and legacy notes prefix
  const enriched = useMemo(() =>
    expenses.map(e => {
      if (e.category && e.category !== "other") return e;
      const parsed = parseNotesCategory(e.notes);
      return {
        ...e,
        category: e.category ?? parsed.category,
        description: e.description ?? (parsed.text || null),
      };
    }),
    [expenses]
  );

  const filtered = useMemo(() => {
    if (activeTab === "All") return enriched;
    if (activeTab === "Other") return enriched.filter(e => !["materials","labor","fuel","tools"].includes(e.category ?? "other"));
    return enriched.filter(e => (e.category ?? "other").toLowerCase() === activeTab.toLowerCase());
  }, [enriched, activeTab]);

  // Summary stats
  const thisMonth = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return enriched.filter(e => (e.receipt_date ?? e.created_at.slice(0, 10)).startsWith(ym));
  }, [enriched]);

  const monthTotal = thisMonth.reduce((s, e) => s + e.total_amount, 0);
  const allTotal = enriched.reduce((s, e) => s + e.total_amount, 0);

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    setDeleting(id);
    try {
      await fetch(`/app/expenses/api/${id}`, { method: "DELETE" });
      setExpenses(prev => prev.filter(e => e.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor.trim()) { setError("Vendor is required."); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Enter a valid amount."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/app/expenses/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendor, description, amount: amt, category, expense_date: expenseDate, job_id: jobId || null, notes }),
      });
      const json = await res.json() as { id?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      // Reset + refresh
      setVendor(""); setDescription(""); setAmount(""); setCategory("materials");
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setJobId(""); setNotes(""); setShowAdd(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">This Month</p>
          <p className="text-xl font-bold text-slate-800">{fmt(monthTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{thisMonth.length} expense{thisMonth.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">All Time</p>
          <p className="text-xl font-bold text-slate-800">{fmt(allTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{enriched.length} total</p>
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={() => setShowAdd(v => !v)}
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white font-semibold"
        style={{ backgroundColor: "#1B3A6B" }}>
        {showAdd ? "✕ Cancel" : "+ Log Expense"}
      </button>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-sm font-bold text-slate-800">New Expense</p>
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Vendor *</label>
              <input
                required
                placeholder="Home Depot"
                value={vendor}
                onChange={e => setVendor(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Amount *</label>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
            <input
              placeholder="What was purchased?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`py-2 rounded-xl text-xs font-medium border transition-colors flex flex-col items-center gap-0.5 ${
                    category === c.value ? "border-blue-400 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600"
                  }`}>
                  <span className="text-base leading-none">{c.emoji}</span>
                  <span className="text-[10px]">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
              <input
                type="date"
                value={expenseDate}
                onChange={e => setExpenseDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Linked Job</label>
              <select
                value={jobId}
                onChange={e => setJobId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">No job</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.job_title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes <span className="normal-case font-normal text-gray-400">(optional)</span></label>
            <textarea
              rows={2}
              placeholder="Additional notes…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl py-3 text-white font-semibold disabled:opacity-60"
            style={{ backgroundColor: "#1B3A6B" }}>
            {submitting ? "Saving…" : "Save Expense"}
          </button>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab ? "text-white" : "bg-white text-gray-600 border border-gray-100"
            }`}
            style={activeTab === tab ? { backgroundColor: "#1B3A6B" } : {}}>
            {tab}
          </button>
        ))}
      </div>

      {/* Expense list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
            <p className="text-3xl mb-2">💸</p>
            <p className="font-medium">No expenses yet.</p>
            <p className="text-sm mt-1">Tap &quot;Log Expense&quot; above to add one, or use Scan Receipt for AI-assisted entry.</p>
          </div>
        )}
        {filtered.map(exp => {
          const meta = catMeta(exp.category);
          const displayDesc = exp.description || exp.notes || "";
          const linkedJob = jobs.find(j => j.id === exp.job_id);
          return (
            <div key={exp.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-lg shrink-0 ${meta.color}`}>
                    {meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{exp.vendor}</p>
                    {displayDesc && <p className="text-xs text-gray-500 truncate">{displayDesc}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                      {exp.receipt_date && <span className="text-[10px] text-gray-400">{fmtDate(exp.receipt_date)}</span>}
                      {linkedJob && <span className="text-[10px] text-blue-500 truncate">📌 {linkedJob.job_title}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 shrink-0">
                  <p className="font-bold text-slate-800">{fmt(exp.total_amount)}</p>
                  <button
                    onClick={() => handleDelete(exp.id)}
                    disabled={deleting === exp.id}
                    className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none mt-0.5"
                    title="Delete">
                    {deleting === exp.id ? "…" : "×"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
