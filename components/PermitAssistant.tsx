"use client";

import { useState } from "react";

type PermitResult = {
  permit_required: string;
  permit_required_detail: string;
  permit_type: string;
  local_authority: string;
  relevant_codes: string[];
  inspection_notes: string;
  disclaimer: string;
};

type Props = {
  defaultDescription?: string;
  defaultAddress?: string;
  jobId?: string;
};

const BADGE_COLORS: Record<string, string> = {
  Yes: "bg-red-100 text-red-700",
  No: "bg-green-100 text-green-700",
  Likely: "bg-amber-100 text-amber-700",
  "Depends on scope": "bg-blue-100 text-blue-700",
};

export function PermitAssistant({ defaultDescription = "", defaultAddress = "", jobId }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "loading" | "result">("form");
  const [description, setDescription] = useState(defaultDescription);
  const [address, setAddress] = useState(defaultAddress);
  const [cityState, setCityState] = useState("");
  const [result, setResult] = useState<PermitResult | null>(null);
  const [error, setError] = useState("");
  const [attaching, setAttaching] = useState(false);
  const [attached, setAttached] = useState(false);

  function openModal() {
    setStep("form");
    setResult(null);
    setError("");
    setAttached(false);
    setDescription(defaultDescription);
    setAddress(defaultAddress);
    setCityState("");
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep("loading");

    try {
      const res = await fetch("/api/ai/permit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, address, cityState }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Something went wrong");
      }

      const data = (await res.json()) as PermitResult;
      setResult(data);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("form");
    }
  }

  async function attachToJob() {
    if (!result || !jobId) return;
    setAttaching(true);

    const noteBody = [
      "📋 PERMIT ASSISTANT REPORT",
      "",
      `Permit Required: ${result.permit_required}`,
      result.permit_required_detail,
      "",
      `Permit Type: ${result.permit_type}`,
      "",
      `Local Authority: ${result.local_authority}`,
      "",
      "Relevant Codes:",
      ...(result.relevant_codes ?? []).map((c) => `• ${c}`),
      "",
      `Inspection Notes: ${result.inspection_notes}`,
      "",
      `⚠️ ${result.disclaimer}`,
    ].join("\n");

    try {
      await fetch(`/api/jobs/${jobId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: noteBody }),
      });
      setAttached(true);
    } finally {
      setAttaching(false);
    }
  }

  const badgeColor = result
    ? (BADGE_COLORS[result.permit_required] ?? "bg-gray-100 text-gray-700")
    : "";

  return (
    <>
      <button
        onClick={openModal}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm border-2 transition-colors"
        style={{ borderColor: "#1B3A6B", color: "#1B3A6B", backgroundColor: "white" }}>
        <span>📋</span> Permit Assistant
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative bg-white rounded-t-3xl shadow-xl max-h-[92vh] flex flex-col">

            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h2 className="text-base font-bold text-slate-800">Permit Assistant</h2>
              </div>
              <button onClick={close} className="text-gray-400 text-xl leading-none">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {step === "form" && (
                <form onSubmit={handleCheck} className="space-y-4">
                  <p className="text-xs text-gray-500">
                    Describe the job and optionally add the location for more accurate results.
                  </p>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Job Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="e.g. Install radon mitigation system in basement, sub-slab depressurization fan and PVC pipe through roof…"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Job Address <span className="text-xs font-normal text-gray-400">(optional)</span>
                    </label>
                    <input
                      placeholder="123 Main St"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      City / State <span className="text-xs font-normal text-gray-400">(optional)</span>
                    </label>
                    <input
                      placeholder="e.g. Columbus, OH"
                      value={cityState}
                      onChange={(e) => setCityState(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl py-3 text-white font-semibold text-sm"
                    style={{ backgroundColor: "#1B3A6B" }}>
                    Check Permit Requirements
                  </button>
                </form>
              )}

              {step === "loading" && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1B3A6B] rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Checking permit requirements…</p>
                </div>
              )}

              {step === "result" && result && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Permit Required</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${badgeColor}`}>
                        {result.permit_required}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mt-2">{result.permit_required_detail}</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Permit Type</p>
                    <p className="text-sm font-semibold text-slate-800 mt-1">{result.permit_type}</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Local Authority</p>
                    <p className="text-sm text-slate-700 mt-1">{result.local_authority}</p>
                  </div>

                  {result.relevant_codes?.length > 0 && (
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Relevant Codes</p>
                      <ul className="space-y-1">
                        {result.relevant_codes.map((code, i) => (
                          <li key={i} className="text-sm text-slate-700 flex gap-2">
                            <span className="text-[#1B3A6B] font-bold shrink-0">•</span>
                            <span>{code}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inspection Notes</p>
                    <p className="text-sm text-slate-700 mt-1">{result.inspection_notes}</p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">⚠️ Disclaimer</p>
                    <p className="text-xs text-amber-800">{result.disclaimer}</p>
                  </div>

                  <div className="flex flex-col gap-2 pt-1 pb-2">
                    {jobId && (
                      <button
                        onClick={attachToJob}
                        disabled={attaching || attached}
                        className="w-full rounded-xl py-3 font-semibold text-sm transition-colors disabled:opacity-60"
                        style={{
                          backgroundColor: attached ? "#22C55E" : "#1B3A6B",
                          color: "white",
                        }}>
                        {attached
                          ? "✓ Attached to Job Notes"
                          : attaching
                          ? "Attaching…"
                          : "Attach to Job Notes"}
                      </button>
                    )}
                    <button
                      onClick={() => { setStep("form"); setResult(null); setAttached(false); }}
                      className="w-full rounded-xl py-3 border border-gray-200 text-slate-600 font-semibold text-sm">
                      Check Another Job
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
