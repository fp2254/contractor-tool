"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type LineItem = {
  description: string;
  qty: number;
  unit_price: number;
  preset_id: string | null;
};

type Extracted = {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  job_title: string;
  scheduled_date: string;
  notes: string;
  line_items: LineItem[];
};

type Step = "idle" | "recording" | "processing" | "preview";

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

function emptyExtracted(): Extracted {
  return {
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    job_title: "",
    scheduled_date: "",
    notes: "",
    line_items: [{ description: "", qty: 1, unit_price: 0, preset_id: null }],
  };
}

export function VoiceJobModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [transcript, setTranscript] = useState("");
  const [liveText, setLiveText] = useState("");
  const [data, setData] = useState<Extracted>(emptyExtracted());
  const [error, setError] = useState("");
  const [creating, setCreating] = useState<"quote" | "job" | "invoice" | null>(null);
  const [hasApi, setHasApi] = useState(false);
  const recogRef = useRef<SpeechRecognition | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setHasApi(!!SR);
  }, []);

  function openModal() {
    setStep("idle");
    setTranscript("");
    setLiveText("");
    setData(emptyExtracted());
    setError("");
    setCreating(null);
    setElapsed(0);
    setOpen(true);
  }

  function close() {
    stopRecording();
    setOpen(false);
  }

  const stopRecording = useCallback(() => {
    recogRef.current?.stop();
    recogRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  function startRecording() {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;

    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = "en-US";

    let final = "";

    recog.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      setLiveText(final + interim);
    };

    recog.onend = () => {
      setTranscript(final.trim() || liveText.trim());
    };

    recog.onerror = () => {
      stopRecording();
      setStep("idle");
      setError("Microphone error. Please try again or type your description below.");
    };

    recogRef.current = recog;
    recog.start();

    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    setStep("recording");
  }

  async function handleStopAndExtract() {
    stopRecording();
    const text = transcript || liveText;
    if (!text.trim()) {
      setError("No speech detected. Please try again.");
      setStep("idle");
      return;
    }
    await extract(text.trim());
  }

  async function handleManualSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const text = String(fd.get("manual") ?? "").trim();
    if (!text) return;
    setTranscript(text);
    await extract(text);
  }

  async function extract(text: string) {
    setError("");
    setStep("processing");
    try {
      const res = await fetch("/api/ai/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      if (!res.ok) throw new Error("Extraction failed");
      const json = (await res.json()) as { transcript: string; extracted: Extracted };
      const ex = json.extracted;
      setData({
        customer_name: ex.customer_name ?? "",
        customer_phone: ex.customer_phone ?? "",
        customer_address: ex.customer_address ?? "",
        job_title: ex.job_title ?? "",
        scheduled_date: ex.scheduled_date ?? "",
        notes: ex.notes ?? "",
        line_items:
          Array.isArray(ex.line_items) && ex.line_items.length > 0
            ? ex.line_items
            : [{ description: "", qty: 1, unit_price: 0, preset_id: null }],
      });
      setTranscript(json.transcript);
      setStep("preview");
    } catch {
      setError("Could not extract job info. Please edit fields manually.");
      setStep("preview");
    }
  }

  async function create(type: "quote" | "job" | "invoice") {
    setCreating(type);
    setError("");
    try {
      const payload = {
        type,
        customer: {
          name: data.customer_name || "Unknown",
          phone: data.customer_phone,
          email: "",
          address: data.customer_address,
        },
        job: {
          title: data.job_title || "Job from Voice",
          scheduled_date: data.scheduled_date || null,
          time_window: null,
          notes: data.notes,
        },
        quote: {
          line_items: data.line_items
            .filter((i) => i.description.trim())
            .map((i) => ({
              description: i.description,
              qty: i.qty,
              unit_price: i.unit_price,
              preset_id: i.preset_id ?? null,
            })),
          notes: data.notes,
        },
      };

      const res = await fetch("/api/ai/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Create failed");
      const json = (await res.json()) as { type: string; id: string };

      setOpen(false);
      if (json.type === "quote") router.push(`/app/quotes/${json.id}`);
      else if (json.type === "job") router.push(`/app/jobs/${json.id}`);
      else if (json.type === "invoice") router.push(`/app/invoices/${json.id}`);
    } catch {
      setError("Failed to create record. Please try again.");
    } finally {
      setCreating(null);
    }
  }

  function updateItem(i: number, field: keyof LineItem, value: string | number | null) {
    setData((d) => ({
      ...d,
      line_items: d.line_items.map((it, idx) =>
        idx === i ? { ...it, [field]: value } : it
      ),
    }));
  }

  function addItem() {
    setData((d) => ({
      ...d,
      line_items: [...d.line_items, { description: "", qty: 1, unit_price: 0, preset_id: null }],
    }));
  }

  function removeItem(i: number) {
    setData((d) => ({
      ...d,
      line_items: d.line_items.filter((_, idx) => idx !== i),
    }));
  }

  const total = data.line_items.reduce((sum, i) => sum + i.qty * i.unit_price, 0);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <>
      <button
        onClick={openModal}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm text-white mt-2"
        style={{ background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)" }}>
        <span>🎤</span> Voice Job
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative bg-white rounded-t-3xl shadow-xl max-h-[94vh] flex flex-col">

            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎤</span>
                <h2 className="text-base font-bold text-slate-800">Voice Job</h2>
              </div>
              <button onClick={close} className="text-gray-400 text-xl leading-none">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">

              {/* ── IDLE / RECORDING ── */}
              {(step === "idle" || step === "recording") && (
                <div className="space-y-5">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {hasApi ? (
                    <div className="flex flex-col items-center gap-4 py-4">
                      {step === "recording" ? (
                        <>
                          <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
                            <button
                              onClick={handleStopAndExtract}
                              className="relative w-24 h-24 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                              <span className="text-3xl">⏹</span>
                            </button>
                          </div>
                          <p className="text-sm font-semibold text-red-600">Recording {fmt(elapsed)}</p>
                          <p className="text-xs text-gray-500 text-center">Tap to stop and process</p>
                          {liveText && (
                            <div className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-slate-700 italic min-h-[60px]">
                              {liveText}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            onClick={startRecording}
                            className="w-24 h-24 rounded-full text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)" }}>
                            <span className="text-4xl">🎤</span>
                          </button>
                          <p className="text-sm font-semibold text-slate-700">Tap to speak</p>
                          <p className="text-xs text-gray-500 text-center max-w-xs">
                            Say something like:<br />
                            <span className="italic">"Radon install for Mike Johnson at 45 Elm Street, around $1200, schedule Friday"</span>
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                      Voice recording isn't supported in this browser. Type your job description below instead.
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-gray-200" />
                    <p className="relative text-center text-xs text-gray-400 bg-white w-fit mx-auto px-3">
                      or type it
                    </p>
                  </div>

                  <form onSubmit={handleManualSubmit} className="space-y-3">
                    <textarea
                      name="manual"
                      rows={4}
                      placeholder="e.g. Radon mitigation install for Mike Johnson at 45 Elm Street Augusta, around $1200, schedule Friday."
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-100 resize-none"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-xl py-3 text-white font-semibold text-sm"
                      style={{ background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)" }}>
                      Extract Job Info
                    </button>
                  </form>
                </div>
              )}

              {/* ── PROCESSING ── */}
              {step === "processing" && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Extracting job details…</p>
                  {transcript && (
                    <div className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-slate-600 italic">
                      &ldquo;{transcript}&rdquo;
                    </div>
                  )}
                </div>
              )}

              {/* ── PREVIEW ── */}
              {step === "preview" && (
                <div className="space-y-4">
                  {transcript && (
                    <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-purple-700 mb-1">Heard</p>
                      <p className="text-sm text-slate-700 italic">&ldquo;{transcript}&rdquo;</p>
                    </div>
                  )}

                  {error && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                      {error} — fill in the fields below and create when ready.
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</p>
                    <input
                      placeholder="Full name"
                      value={data.customer_name}
                      onChange={(e) => setData((d) => ({ ...d, customer_name: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-100"
                    />
                    <input
                      placeholder="Phone (optional)"
                      value={data.customer_phone}
                      onChange={(e) => setData((d) => ({ ...d, customer_phone: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-100"
                    />
                    <input
                      placeholder="Address (optional)"
                      value={data.customer_address}
                      onChange={(e) => setData((d) => ({ ...d, customer_address: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-100"
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Job</p>
                    <input
                      placeholder="Job title"
                      value={data.job_title}
                      onChange={(e) => setData((d) => ({ ...d, job_title: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-100"
                    />
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Scheduled Date</label>
                      <input
                        type="date"
                        value={data.scheduled_date}
                        onChange={(e) => setData((d) => ({ ...d, scheduled_date: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-100"
                      />
                    </div>
                    <textarea
                      placeholder="Notes (optional)"
                      value={data.notes}
                      onChange={(e) => setData((d) => ({ ...d, notes: e.target.value }))}
                      rows={2}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-100 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Line Items</p>
                    {data.line_items.map((item, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <div className="flex gap-2 items-center">
                          <input
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => updateItem(i, "description", e.target.value)}
                            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-100 bg-white"
                          />
                          {data.line_items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(i)}
                              className="text-red-400 text-lg leading-none px-1">✕</button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="Qty"
                            value={item.qty}
                            onChange={(e) => updateItem(i, "qty", Number(e.target.value))}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-100 bg-white"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Unit price ($)"
                            value={item.unit_price}
                            onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-100 bg-white"
                          />
                        </div>
                        {item.preset_id && (
                          <p className="text-xs text-purple-600 font-medium">✓ Matched to price sheet</p>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addItem}
                      className="text-sm font-medium text-purple-700 py-1">
                      + Add Line Item
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <span className="text-sm font-semibold text-slate-700">Total</span>
                    <span className="text-lg font-bold text-[#1B3A6B]">${total.toFixed(2)}</span>
                  </div>

                  <div className="space-y-2 pb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Create as</p>
                    {(["quote", "job", "invoice"] as const).map((type) => {
                      const labels = { quote: "📋 Create Quote", job: "📅 Create Job", invoice: "💰 Create Invoice" };
                      const active = creating === type;
                      return (
                        <button
                          key={type}
                          onClick={() => create(type)}
                          disabled={!!creating}
                          className="w-full rounded-xl py-3 font-semibold text-sm text-white disabled:opacity-60 transition-opacity"
                          style={{ backgroundColor: "#1B3A6B" }}>
                          {active ? "Creating…" : labels[type]}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => { setStep("idle"); setTranscript(""); setLiveText(""); }}
                      className="w-full rounded-xl py-3 border border-gray-200 text-slate-600 font-semibold text-sm">
                      Record Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
