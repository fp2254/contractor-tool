"use client";

import { useState, useEffect } from "react";

type JobBrainResult = {
  permit_likelihood?: { verdict: string; detail: string };
  estimated_time?: { range: string; factors: string };
  recommended_materials?: string[];
  material_checklist?: string[];
  inspection_considerations?: string[];
  permit_guidance?: { office: string; process: string };
  ai_suggestions?: string[];
};

type Props = {
  jobTitle: string;
  description?: string | null;
  address?: string | null;
  cityState?: string | null;
  notes?: string | null;
  clientHistory?: string | null;
  alerts?: string[];
};

const PERMIT_COLORS: Record<string, string> = {
  "Required":          "bg-red-100 text-red-700",
  "Likely Required":   "bg-amber-100 text-amber-700",
  "Depends on Scope":  "bg-yellow-100 text-yellow-700",
  "Unlikely":          "bg-blue-100 text-blue-700",
  "Not Required":      "bg-green-100 text-green-700",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 pt-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  );
}

export function JobBrain({ jobTitle, description, address, cityState, notes, clientHistory, alerts = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JobBrainResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && !result && !loading) {
      run();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/job-brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle, description, address, cityState, notes, clientHistory }),
      });
      const data = await res.json() as JobBrainResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "AI request failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate insights");
    } finally {
      setLoading(false);
    }
  }

  function handleRegenerate() {
    setResult(null);
    run();
  }

  const permitColor = result?.permit_likelihood?.verdict
    ? (PERMIT_COLORS[result.permit_likelihood.verdict] ?? "bg-gray-100 text-gray-600")
    : "";

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-4"
        aria-expanded={open}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <span className="font-bold text-slate-800 text-sm">Job Brain</span>
          {result && !loading && (
            <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">Ready</span>
          )}
        </div>
        <svg
          viewBox="0 0 24 24" className={`h-5 w-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">

          {/* Job alerts (data-driven, always shown) */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
                  <span>⚠️</span>
                  <span>{alert}</span>
                </div>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-8 h-8 border-2 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Analyzing job…</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="text-center py-4">
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <button onClick={run} className="text-sm font-semibold text-[#1B3A6B]">Try Again</button>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="space-y-4">

              {/* Permit + Time row */}
              <div className="grid grid-cols-2 gap-2.5">
                {result.permit_likelihood && (
                  <div className="rounded-xl p-3 bg-gray-50">
                    <p className="text-[11px] text-gray-500 font-medium mb-1">Permit Likelihood</p>
                    <span className={`inline-block text-xs font-bold rounded-full px-2 py-0.5 mb-1 ${permitColor}`}>
                      {result.permit_likelihood.verdict}
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">{result.permit_likelihood.detail}</p>
                  </div>
                )}
                {result.estimated_time && (
                  <div className="rounded-xl p-3 bg-blue-50">
                    <p className="text-[11px] text-gray-500 font-medium mb-1">Est. Install Time</p>
                    <p className="text-lg font-bold text-blue-700 mb-1">{result.estimated_time.range}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{result.estimated_time.factors}</p>
                  </div>
                )}
              </div>

              {/* Material Checklist */}
              {result.material_checklist && result.material_checklist.length > 0 && (
                <Section title="Material Checklist">
                  <div className="space-y-2">
                    {result.material_checklist.map((item, i) => (
                      <label key={i} className="flex items-start gap-2.5 cursor-pointer">
                        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-[#1B3A6B] shrink-0" />
                        <span className="text-sm text-slate-700">{item}</span>
                      </label>
                    ))}
                  </div>
                </Section>
              )}

              {/* Recommended Materials */}
              {result.recommended_materials && result.recommended_materials.length > 0 && (
                <Section title="Recommended Materials">
                  <div className="flex flex-wrap gap-1.5">
                    {result.recommended_materials.map((m, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-slate-700 rounded-full px-3 py-1 font-medium">
                        {m}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Inspection Considerations */}
              {result.inspection_considerations && result.inspection_considerations.length > 0 && (
                <Section title="Inspection Considerations">
                  <ul className="space-y-1.5">
                    {result.inspection_considerations.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-gray-400 shrink-0 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Permit Guidance */}
              {result.permit_guidance && (
                <Section title="Permit Guidance">
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1">
                    <p className="text-xs font-semibold text-amber-800">{result.permit_guidance.office}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{result.permit_guidance.process}</p>
                  </div>
                </Section>
              )}

              {/* AI Suggestions */}
              {result.ai_suggestions && result.ai_suggestions.length > 0 && (
                <Section title="Suggestions">
                  <ul className="space-y-2">
                    {result.ai_suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-[#1B3A6B] shrink-0 mt-0.5">→</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Regenerate */}
              <div className="border-t border-gray-100 pt-3 text-right">
                <button
                  onClick={handleRegenerate}
                  className="text-xs font-semibold text-[#1B3A6B] px-3 py-1.5 rounded-lg border border-[#1B3A6B]/20 active:bg-blue-50">
                  ↻ Regenerate
                </button>
              </div>
            </div>
          )}

          {/* Prompt to analyze when no result yet */}
          {!result && !loading && !error && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400 mb-3">AI insights for this job</p>
              <button
                onClick={run}
                className="rounded-xl px-5 py-2.5 text-white text-sm font-semibold"
                style={{ backgroundColor: "#1B3A6B" }}>
                Analyze Job
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
