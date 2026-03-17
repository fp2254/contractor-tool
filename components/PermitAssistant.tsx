"use client";

import { useState } from "react";
import { AiAttachModal } from "@/components/AiAttachModal";
import type { PermitResult } from "@/app/api/ai/permit/route";

type Props = {
  defaultDescription?: string;
  defaultAddress?: string;
  jobId?: string;
};

export function PermitAssistant({ defaultDescription = "", defaultAddress = "", jobId }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "loading" | "result">("form");
  const [description, setDescription] = useState(defaultDescription);
  const [address, setAddress] = useState(defaultAddress);
  const [cityState, setCityState] = useState("");
  const [result, setResult] = useState<PermitResult | null>(null);
  const [error, setError] = useState("");
  const [aiRunId, setAiRunId] = useState<string | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [attached, setAttached] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);

  function openModal() {
    setStep("form");
    setResult(null);
    setError("");
    setAttached(false);
    setAiRunId(null);
    setDescription(defaultDescription);
    setAddress(defaultAddress);
    setCityState("");
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setShowAttachModal(false);
  }

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep("loading");
    setAiRunId(null);
    setAttached(false);

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

      fetch("/api/ai/run/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature: "permit_assistant",
          input_text: [description.trim(), address, cityState].filter(Boolean).join(" — "),
          input_json: { description, address, cityState },
          output_json: data,
        }),
      })
        .then((r) => r.json())
        .then((j: { id?: string }) => { if (j.id) setAiRunId(j.id); })
        .catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("form");
    }
  }

  async function attachToJob() {
    if (!aiRunId || !jobId) return;
    setAttaching(true);
    try {
      await fetch("/api/ai/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_run_id: aiRunId,
          entity_type: "job",
          entity_id: jobId,
          title: result ? `Permit: ${result.permit_type ?? "Check"}` : "Permit Assistant",
        }),
      });
      setAttached(true);
    } finally {
      setAttaching(false);
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-sm border-2 transition-colors"
        style={{ borderColor: "#1B3A6B", color: "#1B3A6B", backgroundColor: "white" }}>
        <span>📋</span> Permit Assistant
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
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

                  {/* Permit Requirement */}
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Permit Requirement</p>
                    <p className="text-sm font-semibold text-slate-800 mt-1">{result.permit_requirement}</p>
                  </div>

                  {/* Permit Type */}
                  {result.permit_type && (
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Permit Type</p>
                      <p className="text-sm font-semibold text-slate-800 mt-1">{result.permit_type}</p>
                    </div>
                  )}

                  {/* Permit Process */}
                  {result.permit_process.length > 0 && (
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Permit Process</p>
                      <ol className="space-y-1.5">
                        {result.permit_process.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="text-[#1B3A6B] font-bold shrink-0 min-w-[16px]">{i + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Local Authority */}
                  {result.local_authority && (result.local_authority.office_name || result.local_authority.phone || result.local_authority.website) && (
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Local Authority</p>
                      {result.local_authority.office_name && (
                        <p className="text-sm font-semibold text-slate-800">{result.local_authority.office_name}</p>
                      )}
                      {result.local_authority.phone && (
                        <a href={`tel:${result.local_authority.phone}`} className="text-sm text-blue-600">
                          📞 {result.local_authority.phone}
                        </a>
                      )}
                      {result.local_authority.email && (
                        <p className="text-sm text-slate-600">✉️ {result.local_authority.email}</p>
                      )}
                      {result.local_authority.website && (
                        <a href={result.local_authority.website} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-blue-600 block">
                          🌐 {result.local_authority.website}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Inspection Notes */}
                  {result.inspection_notes.length > 0 && (
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inspection Notes</p>
                      <ul className="space-y-1.5">
                        {result.inspection_notes.map((note, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="text-[#1B3A6B] font-bold shrink-0">•</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">⚠️ Disclaimer</p>
                    <p className="text-xs text-amber-800">{result.disclaimer}</p>
                  </div>

                  <div className="flex flex-col gap-2 pt-1 pb-2">
                    {jobId && aiRunId && (
                      <button
                        onClick={attachToJob}
                        disabled={attaching || attached}
                        className="w-full rounded-xl py-3 font-semibold text-sm transition-colors disabled:opacity-60"
                        style={{ backgroundColor: attached ? "#22C55E" : "#1B3A6B", color: "white" }}>
                        {attached ? "✓ Attached to this Job" : attaching ? "Attaching…" : "📌 Attach to this Job"}
                      </button>
                    )}
                    {aiRunId && (
                      <button
                        onClick={() => setShowAttachModal(true)}
                        className="w-full rounded-xl py-3 font-semibold text-sm border-2 transition-colors"
                        style={{ borderColor: "#1B3A6B", color: "#1B3A6B" }}>
                        📎 Attach to Another Record…
                      </button>
                    )}
                    <button
                      onClick={() => { setStep("form"); setResult(null); setAttached(false); setAiRunId(null); }}
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

      {showAttachModal && aiRunId && (
        <AiAttachModal
          aiRunId={aiRunId}
          defaultEntityType={jobId ? "job" : undefined}
          defaultEntityId={jobId}
          onAttached={() => setAttached(true)}
          onClose={() => setShowAttachModal(false)}
        />
      )}
    </>
  );
}
