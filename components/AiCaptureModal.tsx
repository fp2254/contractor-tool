"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AiCaptureOutput } from "@/app/api/ai/capture/route";
import { WarrantySection } from "@/components/WarrantySection";
import { parseWarrantyParts, buildWarrantyText } from "@/lib/warrantyUtils";

type Step = "closed" | "input" | "loading" | "review" | "creating";
type RecStatus = "lead" | "quote" | "job" | "invoice";

type MatchedCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  confidence: "high" | "medium" | "none";
};

type LineItem = {
  preset_id: string | null;
  description: string;
  qty: number;
  unit: string;
  unit_price: number | null;
  needs_manual_pricing: boolean;
  is_ai_estimate: boolean;
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
  warrantyFlags: string[];
  matchedCustomer: MatchedCustomer | null;
  useMatchedCustomer: boolean;
};

type CaptureResponse = AiCaptureOutput & {
  matched_customer_data: MatchedCustomer | null;
};

function toDraft(ai: CaptureResponse): Draft {
  const match = ai.matched_customer_data ?? null;
  const matchedCustomer: MatchedCustomer | null = match
    ? { ...match, confidence: ai.customer_match?.confidence ?? "none" }
    : null;

  const useMatch = !!matchedCustomer && matchedCustomer.confidence === "high";

  const customer = useMatch && matchedCustomer
    ? { name: matchedCustomer.name, phone: matchedCustomer.phone, email: matchedCustomer.email, address: matchedCustomer.address }
    : { name: ai.customer.name, phone: ai.customer.phone, email: ai.customer.email, address: ai.customer.address };

  return {
    job_title: ai.job_title,
    customer,
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
      is_ai_estimate: i.is_ai_estimate ?? false,
      selected: true,
    })),
    warrantyFlags: ai.warranty_flags ?? [],
    matchedCustomer,
    useMatchedCustomer: useMatch,
  };
}

const STATUS_META: Record<RecStatus, { label: string; emoji: string; color: string }> = {
  lead:    { label: "Lead",    emoji: "🎯", color: "#6366F1" },
  quote:   { label: "Quote",   emoji: "📋", color: "#1B3A6B" },
  job:     { label: "Job",     emoji: "🔨", color: "#22C55E" },
  invoice: { label: "Invoice", emoji: "💰", color: "#F97316" },
};

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function AiCaptureModal({ defaultWarrantyText = "" }: { defaultWarrantyText?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("closed");
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState<string | null>(null);
  const [warrantyText, setWarrantyText] = useState(defaultWarrantyText);

  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    setSpeechSupported(!!SR);
  }, []);

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    let finalTranscript = "";
    rec.onstart = () => setListening(true);
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += t + " ";
        else interim = t;
      }
      setText((prev) => (prev.trim() ? prev.trimEnd() + " " + (finalTranscript || interim).trim() : (finalTranscript || interim).trim()));
    };
    rec.onerror = () => { setListening(false); setError("Microphone error — check browser permissions and try again."); };
    rec.onend = () => { setListening(false); recognitionRef.current = null; };
    recognitionRef.current = rec;
    rec.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function open() {
    setText("");
    setError("");
    setDraft(null);
    setWarrantyText(defaultWarrantyText);
    setStep("input");
  }

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("modal=ai-capture")) {
      open();
      const url = new URL(window.location.href);
      url.searchParams.delete("modal");
      window.history.replaceState({}, "", url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    stopListening();
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
      const d = toDraft(json as CaptureResponse);
      setDraft(d);

      // Merge AI-suggested warranty flags with the org's default warranty text
      const { ids: defaultIds, custom: defaultCustom } = parseWarrantyParts(defaultWarrantyText);
      const mergedIds = new Set([...defaultIds, ...(d.warrantyFlags ?? [])]);
      setWarrantyText(buildWarrantyText(mergedIds, defaultCustom));

      setStep("review");
    } catch {
      setError("Network error — please try again");
      setStep("input");
    }
  }

  function acceptMatch() {
    if (!draft?.matchedCustomer) return;
    const m = draft.matchedCustomer;
    setDraft((d) => d ? {
      ...d,
      useMatchedCustomer: true,
      customer: { name: m.name, phone: m.phone, email: m.email, address: m.address },
    } : d);
  }

  function rejectMatch() {
    setDraft((d) => d ? { ...d, useMatchedCustomer: false } : d);
  }

  async function createRecord(type: "quote" | "job" | "invoice") {
    if (!draft) return;

    const selectedItems = draft.lineItems.filter((i) => i.selected);
    const missingPrice = selectedItems.filter((i) => i.unit_price === null || i.unit_price === 0).length;

    if (missingPrice > 0) {
      setError(`${missingPrice} item${missingPrice > 1 ? "s need" : " needs"} a price before saving. Fill in the highlighted fields.`);
      return;
    }

    setError("");
    setCreating(type);

    const combinedNotes = [draft.notes.trim(), warrantyText.trim()].filter(Boolean).join("\n\n");
    const existingCustomerId = draft.useMatchedCustomer && draft.matchedCustomer ? draft.matchedCustomer.id : null;

    try {
      const res = await fetch("/api/ai/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          existing_customer_id: existingCustomerId,
          customer: draft.customer,
          job: {
            title: draft.job_title,
            scheduled_date: draft.scheduled_date || null,
            time_window: draft.time_window || null,
            notes: combinedNotes,
          },
          quote: {
            line_items: selectedItems.map((i) => ({
              description: i.description,
              qty: i.qty,
              unit_price: i.unit_price ?? 0,
              preset_id: i.preset_id,
              unit: i.unit,
            })),
            notes: combinedNotes,
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

  function updateItem(i: number, field: keyof LineItem, value: string | number | boolean | null) {
    setDraft((d) => d ? { ...d, lineItems: d.lineItems.map((item, idx) => idx === i ? { ...item, [field]: value } : item) } : d);
  }

  function addItem() {
    setDraft((d) => d ? {
      ...d,
      lineItems: [...d.lineItems, { preset_id: null, description: "", qty: 1, unit: "each", unit_price: null, needs_manual_pricing: true, is_ai_estimate: false, selected: true }],
    } : d);
  }

  function removeItem(i: number) {
    setDraft((d) => d ? { ...d, lineItems: d.lineItems.filter((_, idx) => idx !== i) } : d);
  }

  const selectedItems = draft?.lineItems.filter((i) => i.selected) ?? [];
  const selectedTotal = selectedItems.reduce((s, i) => s + i.qty * (i.unit_price ?? 0), 0);
  const missingPriceCount = selectedItems.filter((i) => i.unit_price === null || i.unit_price === 0).length;

  if (step === "closed") {
    return (
      <button
        onClick={open}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-4 font-semibold text-sm text-white"
        style={{ background: "linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)" }}>
        <span className="text-lg">✨</span> AI Job Capture
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="mt-auto bg-white rounded-t-2xl flex flex-col overflow-hidden" style={{ maxHeight: "92vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)" }}>
          <div>
            <p className="text-white font-bold text-base">✨ AI Job Capture</p>
            <p className="text-blue-200 text-xs">
              {step === "input" && "Type or speak the job details"}
              {step === "loading" && "AI is building your draft…"}
              {step === "review" && "Review and edit before creating"}
              {step === "creating" && "Creating your draft…"}
            </p>
          </div>
          <button onClick={close} className="text-white text-2xl leading-none px-1">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* STEP: Input */}
          {(step === "input" || step === "loading") && (
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`e.g. "Radon mitigation for Mike Johnson at 123 Oak St — fan and piping. Schedule next Friday morning."`}
                  rows={5}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none pr-12"
                  disabled={step === "loading"}
                />
                {speechSupported && (
                  <button
                    type="button"
                    onPointerDown={startListening}
                    onPointerUp={stopListening}
                    onPointerLeave={stopListening}
                    disabled={step === "loading"}
                    className={`absolute right-3 bottom-3 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      listening ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 text-gray-500 active:bg-blue-100 active:text-[#1B3A6B]"
                    }`}
                    title="Hold to speak">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  </button>
                )}
              </div>

              {listening && (
                <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  Listening… release to stop
                </div>
              )}

              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1">
                <p><span className="font-semibold">Tip:</span> {speechSupported ? "Hold the mic button and speak, or type below." : "Type the job details below."}</p>
                <p>Set up Service Presets in Business Profile for exact pricing — otherwise the AI will estimate market rates.</p>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              {step === "loading" && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <span className="inline-block h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  <span className="text-sm text-gray-500">Matching presets and building draft…</span>
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
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-white text-xs font-semibold" style={{ backgroundColor: meta.color }}>
                    <span>{meta.emoji}</span>
                    AI suggests: <span className="font-bold">{meta.label}</span>
                  </div>
                );
              })()}

              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

              {/* Customer match banner */}
              {draft.matchedCustomer && draft.matchedCustomer.confidence !== "none" && (
                <div className={`rounded-xl px-4 py-3 space-y-2 ${
                  draft.useMatchedCustomer ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"
                }`}>
                  {draft.useMatchedCustomer ? (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-green-800">
                          ✓ Linked to existing client
                        </p>
                        <p className="text-xs text-green-700 mt-0.5">{draft.matchedCustomer.name}</p>
                      </div>
                      <button
                        onClick={rejectMatch}
                        className="text-xs text-green-600 underline whitespace-nowrap mt-0.5">
                        Create new
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-amber-800 mb-1.5">
                        {draft.matchedCustomer.confidence === "high" ? "Existing client found:" : "Did you mean:"}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-amber-900">{draft.matchedCustomer.name}</p>
                          {draft.matchedCustomer.phone && <p className="text-xs text-amber-700">{draft.matchedCustomer.phone}</p>}
                          {draft.matchedCustomer.address && <p className="text-xs text-amber-700">{draft.matchedCustomer.address}</p>}
                        </div>
                        <button
                          onClick={acceptMatch}
                          className="flex-shrink-0 bg-amber-600 text-white text-xs font-semibold rounded-lg px-3 py-2">
                          Use This Client
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Customer fields */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Customer</p>
                <div className={`rounded-xl p-3 space-y-2 ${draft.useMatchedCustomer ? "bg-green-50" : "bg-gray-50"}`}>
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

              {/* Job Details */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Job Details</p>
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <input
                    value={draft.job_title}
                    onChange={(e) => setDraft((d) => d ? { ...d, job_title: e.target.value } : d)}
                    placeholder="Job title"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={draft.scheduled_date}
                      onChange={(e) => setDraft((d) => d ? { ...d, scheduled_date: e.target.value } : d)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                    />
                    <input
                      value={draft.time_window}
                      onChange={(e) => setDraft((d) => d ? { ...d, time_window: e.target.value } : d)}
                      placeholder="Time (e.g. 8am–12pm)"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                    />
                  </div>
                  <textarea
                    value={draft.notes}
                    onChange={(e) => setDraft((d) => d ? { ...d, notes: e.target.value } : d)}
                    placeholder="Notes"
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white resize-none"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Line Items</p>
                  {missingPriceCount > 0 && (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
                      {missingPriceCount} need{missingPriceCount > 1 ? "" : "s"} pricing
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {draft.lineItems.map((item, i) => {
                    const missingPrice = item.unit_price === null || item.unit_price === 0;
                    const highlight = missingPrice && item.selected;
                    return (
                      <div key={i} className={`rounded-xl p-3 space-y-2 border-2 transition-colors ${
                        highlight ? "bg-amber-50 border-amber-300" : "bg-gray-50 border-transparent"
                      }`}>
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(e) => updateItem(i, "selected", e.target.checked)}
                            className="mt-1 accent-blue-700 h-4 w-4 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <input
                              value={item.description}
                              onChange={(e) => updateItem(i, "description", e.target.value)}
                              placeholder="Description"
                              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                            />
                          </div>
                          <button onClick={() => removeItem(i)} className="text-red-400 text-lg leading-none px-1 flex-shrink-0">×</button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pl-6">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">Qty</span>
                            <input
                              type="number" min="0.1" step="0.1"
                              value={item.qty}
                              onChange={(e) => updateItem(i, "qty", Number(e.target.value))}
                              className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">$</span>
                            <input
                              type="number" min="0" step="0.01"
                              value={item.unit_price ?? ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? null : Number(e.target.value);
                                updateItem(i, "unit_price", val);
                                if (val !== null) updateItem(i, "needs_manual_pricing", false);
                              }}
                              placeholder={missingPrice ? "Enter price" : "0"}
                              className={`flex-1 rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2 bg-white ${
                                highlight ? "border-amber-400 focus:ring-amber-100" : "border-gray-200 focus:ring-blue-100"
                              }`}
                            />
                          </div>
                          <input
                            value={item.unit}
                            onChange={(e) => updateItem(i, "unit", e.target.value)}
                            placeholder="unit"
                            className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                          />
                        </div>

                        <div className="pl-6 flex items-center justify-between">
                          {item.preset_id ? (
                            <span className="text-xs text-blue-600 font-medium">✓ From your price sheet</span>
                          ) : item.is_ai_estimate && item.unit_price && item.unit_price > 0 ? (
                            <span className="text-xs text-purple-600 font-medium">✨ AI estimate — verify</span>
                          ) : missingPrice && item.selected ? (
                            <span className="text-xs text-amber-600 font-medium">⚠ Enter price manually</span>
                          ) : (
                            <span />
                          )}
                          <p className="text-xs text-gray-500">${((item.unit_price ?? 0) * item.qty).toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}

                  <button onClick={addItem} className="text-sm font-medium text-blue-700 py-1">
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

              {/* Warranty / Terms */}
              <div className="bg-gray-50 rounded-xl p-4">
                <WarrantySection
                  value={warrantyText}
                  onChange={setWarrantyText}
                />
              </div>

              <button
                onClick={() => { setStep("input"); setError(""); }}
                className="text-sm text-gray-400 underline">
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
              style={{ background: "linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)" }}>
              {step === "loading" ? (
                <>
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Building Draft…
                </>
              ) : "✨ Generate Draft"}
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
                      style={{ backgroundColor: color, outline: isRec ? "3px solid #FBBF24" : "none", outlineOffset: "2px" }}>
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
              {missingPriceCount > 0 && (
                <p className="text-xs text-center text-amber-600 font-medium">
                  Fill in {missingPriceCount} amber-highlighted price{missingPriceCount > 1 ? "s" : ""} before saving
                </p>
              )}
              <p className="text-xs text-center text-gray-400">Nothing is saved until you tap a button above</p>
            </>
          )}

          <button onClick={close} className="w-full rounded-xl py-2 text-sm text-gray-400">Cancel</button>
        </div>
      </div>
    </div>
  );
}
