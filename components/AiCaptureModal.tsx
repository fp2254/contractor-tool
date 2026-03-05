"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AiCaptureOutput } from "@/app/api/ai/capture/route";

type Step = "closed" | "input" | "loading" | "review" | "creating";
type RecStatus = "lead" | "quote" | "job" | "invoice";

type LineItem = {
  preset_id: string | null;
  description: string;
  qty: number;
  unit: string;
  unit_price: number | null;
  needs_manual_pricing: boolean;
  selected: boolean;
};

type Draft = {
  job_title: string;
  customer: { name: string; phone: string; email: string; address: string };
  scheduled_date: string;
  time_window: string;
  notes: string;
  recommended_status: RecStatus;
  lineItems: LineItem[];
};

function toDraft(ai: AiCaptureOutput): Draft {
  return {
    job_title: ai.job_title,
    customer: {
      name: ai.customer.name,
      phone: ai.customer.phone,
      email: ai.customer.email,
      address: ai.customer.address,
    },
    scheduled_date: ai.schedule.date ?? "",
    time_window: ai.schedule.time_window ?? "",
    notes: ai.notes ?? "",
    recommended_status: ai.recommended_status,
    lineItems: ai.line_items.map((i) => ({
      preset_id: i.preset_id,
      description: i.description,
      qty: i.qty,
      unit: i.unit,
      unit_price: i.unit_price,
      needs_manual_pricing: i.needs_manual_pricing,
      selected: true,
    })),
  };
}

const STATUS_META: Record<
  RecStatus,
  { label: string; emoji: string; color: string }
> = {
  lead: { label: "Lead", emoji: "🎯", color: "#6366F1" },
  quote: { label: "Quote", emoji: "📋", color: "#1B3A6B" },
  job: { label: "Job", emoji: "🔨", color: "#22C55E" },
  invoice: { label: "Invoice", emoji: "💰", color: "#F97316" },
};

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
    setCreating(null);
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

    const selectedItems = draft.lineItems.filter((i) => i.selected);
    const unpricedCount = selectedItems.filter(
      (i) => i.needs_manual_pricing && (i.unit_price === null || i.unit_price === 0)
    ).length;

    if (unpricedCount > 0) {
      setError(
        `${unpricedCount} item${unpricedCount > 1 ? "s need" : " needs"} a price before saving. Fill in the highlighted fields.`
      );
      return;
    }

    setError("");
    setCreating(type);

    try {
      const res = await fetch("/api/ai/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          customer: draft.customer,
          job: {
            title: draft.job_title,
            scheduled_date: draft.scheduled_date || null,
            time_window: draft.time_window || null,
            notes: draft.notes,
          },
          quote: {
            line_items: selectedItems.map((i) => ({
              description: i.description,
              qty: i.qty,
              unit_price: i.unit_price ?? 0,
              preset_id: i.preset_id,
              unit: i.unit,
            })),
            notes: draft.notes,
          },
        }),
      });

      const json = (await res.json()) as {
        id?: string;
        type?: string;
        error?: string;
      };

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

  function updateItem(
    i: number,
    field: keyof LineItem,
    value: string | number | boolean | null
  ) {
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
              {
                preset_id: null,
                description: "",
                qty: 1,
                unit: "each",
                unit_price: null,
                needs_manual_pricing: true,
                selected: true,
              },
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

  const selectedItems = draft?.lineItems.filter((i) => i.selected) ?? [];
  const selectedTotal = selectedItems.reduce(
    (s, i) => s + i.qty * (i.unit_price ?? 0),
    0
  );
  const unpricedSelected = selectedItems.filter(
    (i) => i.needs_manual_pricing && (i.unit_price === null || i.unit_price === 0)
  ).length;

  if (step === "closed") {
    return (
      <button
        onClick={open}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-4 font-semibold text-sm text-white"
        style={{
          background: "linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)",
        }}
      >
        <span className="text-lg">✨</span> AI Job Capture
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: "rgba(0,0,0,0.55)" }}
    >
      <div
        className="mt-auto bg-white rounded-t-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)",
          }}
        >
          <div>
            <p className="text-white font-bold text-base">✨ AI Job Capture</p>
            <p className="text-blue-200 text-xs">
              {step === "input" && "Describe the job in plain English"}
              {step === "loading" && "AI is building your draft…"}
              {step === "review" && "Review and edit before creating"}
              {step === "creating" && "Creating your draft…"}
            </p>
          </div>
          <button
            onClick={close}
            className="text-white text-2xl leading-none px-1"
          >
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
                placeholder={`e.g. "Radon mitigation system for Mike Johnson at 123 Oak St — needs fan and piping. Schedule for next Friday morning."`}
                rows={5}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                disabled={step === "loading"}
              />
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                <span className="font-semibold">Tip:</span> Pricing comes from
                your saved Service Presets — set those up in Business Profile
                for accurate AI quotes.
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              {step === "loading" && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <span className="inline-block h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  <span className="text-sm text-gray-500">
                    Matching your presets and building draft…
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP: Review */}
          {(step === "review" || step === "creating") && draft && (
            <div className="space-y-5">
              {/* AI recommendation badge */}
              {(() => {
                const meta = STATUS_META[draft.recommended_status];
                return (
                  <div
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-white text-xs font-semibold"
                    style={{ backgroundColor: meta.color }}
                  >
                    <span>{meta.emoji}</span>
                    AI suggests:{" "}
                    <span className="font-bold">{meta.label}</span>
                  </div>
                );
              })()}

              {error && (
                <p className="text-xs text-red-500 font-medium">{error}</p>
              )}

              {/* Customer */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Customer
                </p>
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <input
                    value={draft.customer.name}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              customer: {
                                ...d.customer,
                                name: e.target.value,
                              },
                            }
                          : d
                      )
                    }
                    placeholder="Full name"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={draft.customer.phone}
                      onChange={(e) =>
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                customer: {
                                  ...d.customer,
                                  phone: e.target.value,
                                },
                              }
                            : d
                        )
                      }
                      placeholder="Phone"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                    />
                    <input
                      value={draft.customer.email}
                      onChange={(e) =>
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                customer: {
                                  ...d.customer,
                                  email: e.target.value,
                                },
                              }
                            : d
                        )
                      }
                      placeholder="Email"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                    />
                  </div>
                  <input
                    value={draft.customer.address}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              customer: {
                                ...d.customer,
                                address: e.target.value,
                              },
                            }
                          : d
                      )
                    }
                    placeholder="Address"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                  />
                </div>
              </div>

              {/* Job */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Job Details
                </p>
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <input
                    value={draft.job_title}
                    onChange={(e) =>
                      setDraft((d) =>
                        d ? { ...d, job_title: e.target.value } : d
                      )
                    }
                    placeholder="Job title"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={draft.scheduled_date}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, scheduled_date: e.target.value } : d
                        )
                      }
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                    />
                    <input
                      value={draft.time_window}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, time_window: e.target.value } : d
                        )
                      }
                      placeholder="Time (e.g. 8am-12pm)"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                    />
                  </div>
                  <textarea
                    value={draft.notes}
                    onChange={(e) =>
                      setDraft((d) =>
                        d ? { ...d, notes: e.target.value } : d
                      )
                    }
                    placeholder="Notes"
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white resize-none"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Line Items
                  </p>
                  {unpricedSelected > 0 && (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
                      {unpricedSelected} need{unpricedSelected > 1 ? "" : "s"}{" "}
                      pricing
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {draft.lineItems.map((item, i) => {
                    const needsPrice =
                      item.needs_manual_pricing &&
                      (item.unit_price === null || item.unit_price === 0);
                    return (
                      <div
                        key={i}
                        className={`rounded-xl p-3 space-y-2 border-2 transition-colors ${
                          needsPrice && item.selected
                            ? "bg-amber-50 border-amber-300"
                            : "bg-gray-50 border-transparent"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(e) =>
                              updateItem(i, "selected", e.target.checked)
                            }
                            className="mt-1 accent-blue-700 h-4 w-4 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <input
                              value={item.description}
                              onChange={(e) =>
                                updateItem(i, "description", e.target.value)
                              }
                              placeholder="Description"
                              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                            />
                          </div>
                          <button
                            onClick={() => removeItem(i)}
                            className="text-red-400 text-lg leading-none px-1 flex-shrink-0"
                          >
                            ×
                          </button>
                        </div>

                        {/* Pricing row */}
                        <div className="grid grid-cols-3 gap-2 pl-6">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">Qty</span>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={item.qty}
                              onChange={(e) =>
                                updateItem(i, "qty", Number(e.target.value))
                              }
                              className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price ?? ""}
                              onChange={(e) => {
                                const val =
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value);
                                updateItem(i, "unit_price", val);
                                if (val !== null && val > 0) {
                                  updateItem(i, "needs_manual_pricing", false);
                                }
                              }}
                              placeholder={
                                item.needs_manual_pricing ? "Enter price" : "0"
                              }
                              className={`flex-1 rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2 bg-white ${
                                needsPrice && item.selected
                                  ? "border-amber-400 focus:ring-amber-100"
                                  : "border-gray-200 focus:ring-blue-100"
                              }`}
                            />
                          </div>
                          <input
                            value={item.unit}
                            onChange={(e) =>
                              updateItem(i, "unit", e.target.value)
                            }
                            placeholder="unit"
                            className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                          />
                        </div>

                        {/* Preset badge or manual pricing warning */}
                        <div className="pl-6 flex items-center justify-between">
                          {item.preset_id ? (
                            <span className="text-xs text-blue-600 font-medium">
                              ✓ From your price sheet
                            </span>
                          ) : item.needs_manual_pricing && item.selected ? (
                            <span className="text-xs text-amber-600 font-medium">
                              ⚠ Enter price manually
                            </span>
                          ) : (
                            <span />
                          )}
                          <p className="text-xs text-gray-500">
                            ${((item.unit_price ?? 0) * item.qty).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={addItem}
                    className="text-sm font-medium text-blue-700 py-1"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
                  <span className="text-white text-sm font-semibold">
                    Selected Total
                  </span>
                  <span className="text-white text-lg font-bold">
                    $
                    {selectedTotal.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setStep("input");
                  setError("");
                }}
                className="text-sm text-gray-400 underline"
              >
                ← Edit description
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-5 border-t border-gray-100 space-y-2 bg-white">
          {(step === "input" || step === "loading") && (
            <button
              onClick={generate}
              disabled={!text.trim() || step === "loading"}
              className="w-full rounded-xl py-3 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background:
                  "linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)",
              }}
            >
              {step === "loading" ? (
                <>
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Building Draft…
                </>
              ) : (
                "✨ Generate Draft"
              )}
            </button>
          )}

          {(step === "review" || step === "creating") && draft && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { type: "quote" as const, emoji: "📋", label: "Quote", color: "#1B3A6B" },
                    { type: "job" as const, emoji: "🔨", label: "Job", color: "#22C55E" },
                    { type: "invoice" as const, emoji: "💰", label: "Invoice", color: "#F97316" },
                  ] as const
                ).map(({ type, emoji, label, color }) => {
                  const isRec = draft.recommended_status === type;
                  return (
                    <button
                      key={type}
                      onClick={() => createRecord(type)}
                      disabled={!!creating}
                      className="relative rounded-xl py-3 text-white font-semibold text-xs disabled:opacity-50 flex flex-col items-center gap-0.5"
                      style={{
                        backgroundColor: color,
                        outline: isRec ? "3px solid #FBBF24" : "none",
                        outlineOffset: "2px",
                      }}
                    >
                      {isRec && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-800 text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none whitespace-nowrap">
                          AI pick
                        </span>
                      )}
                      <span className="text-base">{emoji}</span>
                      {creating === type ? "…" : label}
                    </button>
                  );
                })}
              </div>
              {unpricedSelected > 0 && (
                <p className="text-xs text-center text-amber-600 font-medium">
                  Fill in {unpricedSelected} amber-highlighted price
                  {unpricedSelected > 1 ? "s" : ""} before saving
                </p>
              )}
              <p className="text-xs text-center text-gray-400">
                Nothing is saved until you tap a button above
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
