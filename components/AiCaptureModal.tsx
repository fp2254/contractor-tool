"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AiCaptureOutput } from "@/app/api/ai/capture/route";

type Step = "closed" | "input" | "loading" | "review" | "creating";

type LineItem = { description: string; qty: number; unit_price: number; selected: boolean };

type Draft = {
  customer: { name: string; phone: string; email: string; address: string };
  job: { title: string; scheduled_date: string; notes: string };
  lineItems: LineItem[];
  notes: string;
};

function toDraft(ai: AiCaptureOutput): Draft {
  return {
    customer: {
      name: ai.customer.name,
      phone: ai.customer.phone,
      email: ai.customer.email,
      address: ai.customer.address,
    },
    job: {
      title: ai.job.title,
      scheduled_date: ai.job.scheduled_date ?? "",
      notes: ai.job.notes,
    },
    lineItems: ai.quote.line_items.map((i) => ({
      description: i.description,
      qty: i.qty,
      unit_price: i.unit_price,
      selected: true,
    })),
    notes: ai.quote.notes,
  };
}

export function AiCaptureModal() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("closed");
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState<string | null>(null);

  function open() {
    setText("");
    setError("");
    setDraft(null);
    setStep("input");
  }

  function close() {
    setStep("closed");
  }

  async function generate() {
    if (!text.trim()) return;
    setError("");
    setStep("loading");
    try {
      const res = await fetch("/api/ai/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "AI failed — please try again");
        setStep("input");
        return;
      }
      setDraft(toDraft(json as AiCaptureOutput));
      setStep("review");
    } catch {
      setError("Network error — please try again");
      setStep("input");
    }
  }

  async function createRecord(type: "quote" | "job" | "invoice") {
    if (!draft) return;
    setCreating(type);
    try {
      const res = await fetch("/api/ai/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          customer: draft.customer,
          job: draft.job,
          quote: {
            line_items: draft.lineItems
              .filter((i) => i.selected)
              .map((i) => ({ description: i.description, qty: i.qty, unit_price: i.unit_price })),
            notes: draft.notes,
          },
        }),
      });
      const json = await res.json() as { id?: string; type?: string; error?: string };
      if (!res.ok || !json.id) {
        setError(json.error ?? "Could not create record");
        setCreating(null);
        return;
      }
      setStep("closed");
      const paths: Record<string, string> = {
        quote: `/app/quotes/${json.id}`,
        job: `/app/jobs/${json.id}`,
        invoice: `/app/invoices/${json.id}`,
      };
      router.push(paths[json.type ?? type]);
    } catch {
      setError("Network error — please try again");
      setCreating(null);
    }
  }

  function updateItem(i: number, field: keyof LineItem, value: string | number | boolean) {
    setDraft((d) =>
      d
        ? {
            ...d,
            lineItems: d.lineItems.map((item, idx) =>
              idx === i ? { ...item, [field]: value } : item
            ),
          }
        : d
    );
  }

  function addItem() {
    setDraft((d) =>
      d
        ? {
            ...d,
            lineItems: [
              ...d.lineItems,
              { description: "", qty: 1, unit_price: 0, selected: true },
            ],
          }
        : d
    );
  }

  function removeItem(i: number) {
    setDraft((d) =>
      d ? { ...d, lineItems: d.lineItems.filter((_, idx) => idx !== i) } : d
    );
  }

  const selectedTotal =
    draft?.lineItems
      .filter((i) => i.selected)
      .reduce((s, i) => s + i.qty * i.unit_price, 0) ?? 0;

  if (step === "closed") {
    return (
      <button
        onClick={open}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-4 font-semibold text-sm text-white"
        style={{ background: "linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)" }}
      >
        <span className="text-lg">✨</span> AI Job Capture
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div
        className="mt-auto bg-white rounded-t-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)" }}
        >
          <div>
            <p className="text-white font-bold text-base">✨ AI Job Capture</p>
            <p className="text-blue-200 text-xs">
              {step === "input" && "Describe the job in a sentence or two"}
              {step === "loading" && "Generating your draft…"}
              {step === "review" && "Review and edit before creating"}
              {step === "creating" && "Creating your draft…"}
            </p>
          </div>
          <button onClick={close} className="text-white text-2xl leading-none px-1">
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* STEP: Input */}
          {(step === "input" || step === "loading") && (
            <div className="space-y-4">
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`e.g. "Install a radon mitigation system for Mike Johnson at 123 Oak St. Needs fan, piping and labor. Around $1,200. Schedule for next Friday."`}
                rows={5}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                disabled={step === "loading"}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              {step === "loading" && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <span className="inline-block h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  <span className="text-sm text-gray-500">AI is reading your description…</span>
                </div>
              )}
            </div>
          )}

          {/* STEP: Review */}
          {(step === "review" || step === "creating") && draft && (
            <div className="space-y-5">
              {error && <p className="text-xs text-red-500">{error}</p>}

              {/* Customer */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Customer</p>
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <input
                    value={draft.customer.name}
                    onChange={(e) => setDraft((d) => d ? { ...d, customer: { ...d.customer, name: e.target.value } } : d)}
                    placeholder="Full name"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={draft.customer.phone}
                      onChange={(e) => setDraft((d) => d ? { ...d, customer: { ...d.customer, phone: e.target.value } } : d)}
                      placeholder="Phone"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                    />
                    <input
                      value={draft.customer.email}
                      onChange={(e) => setDraft((d) => d ? { ...d, customer: { ...d.customer, email: e.target.value } } : d)}
                      placeholder="Email"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                    />
                  </div>
                  <input
                    value={draft.customer.address}
                    onChange={(e) => setDraft((d) => d ? { ...d, customer: { ...d.customer, address: e.target.value } } : d)}
                    placeholder="Address"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                  />
                </div>
              </div>

              {/* Job */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Job Details</p>
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <input
                    value={draft.job.title}
                    onChange={(e) => setDraft((d) => d ? { ...d, job: { ...d.job, title: e.target.value } } : d)}
                    placeholder="Job title"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                  />
                  <input
                    type="date"
                    value={draft.job.scheduled_date}
                    onChange={(e) => setDraft((d) => d ? { ...d, job: { ...d.job, scheduled_date: e.target.value } } : d)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                  />
                  <textarea
                    value={draft.job.notes}
                    onChange={(e) => setDraft((d) => d ? { ...d, job: { ...d.job, notes: e.target.value } } : d)}
                    placeholder="Notes"
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white resize-none"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Suggested Line Items</p>
                <div className="space-y-2">
                  {draft.lineItems.map((item, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => updateItem(i, "selected", e.target.checked)}
                          className="mt-1 accent-blue-700 h-4 w-4 flex-shrink-0"
                        />
                        <input
                          value={item.description}
                          onChange={(e) => updateItem(i, "description", e.target.value)}
                          placeholder="Description"
                          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                        />
                        <button
                          onClick={() => removeItem(i)}
                          className="text-red-400 text-lg leading-none px-1 flex-shrink-0"
                        >
                          ×
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pl-6">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">Qty</span>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={item.qty}
                            onChange={(e) => updateItem(i, "qty", Number(e.target.value))}
                            className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))}
                            className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-right text-gray-500 pr-1">
                        Subtotal: ${(item.qty * item.unit_price).toFixed(2)}
                      </p>
                    </div>
                  ))}
                  <button
                    onClick={addItem}
                    className="text-sm font-medium text-blue-700 py-1"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
                  <span className="text-white text-sm font-semibold">Selected Total</span>
                  <span className="text-white text-lg font-bold">
                    ${selectedTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Back */}
              <button
                onClick={() => { setStep("input"); setError(""); }}
                className="text-sm text-gray-400 underline"
              >
                ← Edit description
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex-shrink-0 p-5 border-t border-gray-100 space-y-2 bg-white">
          {(step === "input" || step === "loading") && (
            <button
              onClick={generate}
              disabled={!text.trim() || step === "loading"}
              className="w-full rounded-xl py-3 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)" }}
            >
              {step === "loading" ? (
                <>
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Generating…
                </>
              ) : (
                "✨ Generate Draft"
              )}
            </button>
          )}

          {(step === "review" || step === "creating") && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => createRecord("quote")}
                  disabled={!!creating}
                  className="rounded-xl py-3 text-white font-semibold text-xs disabled:opacity-50"
                  style={{ backgroundColor: "#1B3A6B" }}
                >
                  {creating === "quote" ? "…" : "📋 Quote"}
                </button>
                <button
                  onClick={() => createRecord("job")}
                  disabled={!!creating}
                  className="rounded-xl py-3 text-white font-semibold text-xs disabled:opacity-50"
                  style={{ backgroundColor: "#22C55E" }}
                >
                  {creating === "job" ? "…" : "🔨 Job"}
                </button>
                <button
                  onClick={() => createRecord("invoice")}
                  disabled={!!creating}
                  className="rounded-xl py-3 text-white font-semibold text-xs disabled:opacity-50"
                  style={{ backgroundColor: "#F97316" }}
                >
                  {creating === "invoice" ? "…" : "💰 Invoice"}
                </button>
              </div>
              <p className="text-xs text-center text-gray-400">
                Choose what to create — nothing is saved until you tap a button above
              </p>
            </>
          )}

          <button
            onClick={close}
            className="w-full rounded-xl py-2 text-sm text-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
