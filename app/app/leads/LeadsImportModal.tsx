"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LeadScanResult } from "@/api/leads/scan/route";

type Step = "idle" | "scanning" | "preview" | "importing" | "done" | "error";

export default function LeadsImportModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [leads, setLeads] = useState<LeadScanResult[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function reset() {
    setStep("idle");
    setLeads([]);
    setErrorMsg("");
    setImportedCount(0);
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 300);
  }

  async function scanLeads(body: { type: "csv"; text: string } | { type: "image"; image_data_url: string }) {
    setStep("scanning");
    setErrorMsg("");
    try {
      const res = await fetch("/api/leads/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { leads?: LeadScanResult[]; error?: string };
      if (!res.ok || !json.leads) throw new Error(json.error ?? "Scan failed");
      if (json.leads.length === 0) throw new Error("No leads found in this file. Make sure it has a Name column.");
      setLeads(json.leads);
      setStep("preview");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStep("error");
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".ods")) {
      setErrorMsg("Excel files aren't supported directly. Open the file and save it as CSV first, then upload.");
      setStep("error");
      return;
    }

    const text = await file.text();
    await scanLeads({ type: "csv", text });
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      await scanLeads({ type: "image", image_data_url: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  function removeLead(idx: number) {
    setLeads(prev => prev.filter((_, i) => i !== idx));
  }

  async function confirmImport() {
    setStep("importing");
    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads }),
      });
      const json = await res.json() as { count?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      setImportedCount(json.count ?? leads.length);
      setStep("done");
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Import failed");
      setStep("error");
    }
  }

  return (
    <>
      <button
        onClick={() => { reset(); setOpen(true); }}
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 font-semibold border border-gray-200 bg-white text-slate-700 text-sm"
      >
        <span>📥</span> Import Leads
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative bg-white rounded-t-3xl w-full max-h-[92vh] flex flex-col">

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 pt-1 shrink-0">
              <h2 className="text-lg font-bold text-slate-800">
                {step === "preview" ? `Review ${leads.length} Lead${leads.length !== 1 ? "s" : ""}` :
                 step === "done" ? "Import Complete" :
                 "Import Leads"}
              </h2>
              <button onClick={close} className="text-gray-400 text-2xl leading-none">×</button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 pb-8">

              {/* idle — pick method */}
              {step === "idle" && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 mb-4">
                    Upload a CSV file or take a photo of a leads sheet — we'll extract the contacts automatically.
                  </p>

                  <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={handleFile} />
                  <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />

                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-4 w-full bg-gray-50 rounded-2xl px-4 py-4 text-left active:bg-gray-100"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: "#EFF6FF" }}>
                      📄
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">Upload CSV File</p>
                      <p className="text-xs text-gray-400 mt-0.5">From Google Sheets, Excel (save as CSV), or any spreadsheet</p>
                    </div>
                  </button>

                  <button
                    onClick={() => photoRef.current?.click()}
                    className="flex items-center gap-4 w-full bg-gray-50 rounded-2xl px-4 py-4 text-left active:bg-gray-100"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: "#F0FDF4" }}>
                      📷
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">Take a Photo</p>
                      <p className="text-xs text-gray-400 mt-0.5">Point your camera at a printed leads sheet — AI will read it</p>
                    </div>
                  </button>

                  <div className="mt-4 p-3 bg-amber-50 rounded-xl">
                    <p className="text-xs text-amber-700 font-semibold mb-1">CSV tip</p>
                    <p className="text-xs text-amber-600">Your CSV just needs a Name column. Phone, Email, Address, City, State, and Service Type are picked up automatically if present.</p>
                  </div>
                </div>
              )}

              {/* scanning */}
              {step === "scanning" && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                  <p className="text-sm font-semibold text-slate-600">Reading your leads…</p>
                  <p className="text-xs text-gray-400">This takes a few seconds</p>
                </div>
              )}

              {/* preview */}
              {step === "preview" && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Review the leads below. Tap × to remove any you don't want to import.</p>

                  <div className="space-y-2">
                    {leads.map((lead, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-800 truncate">{lead.name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            {lead.phone && <p className="text-xs text-gray-500">📞 {lead.phone}</p>}
                            {lead.email && <p className="text-xs text-gray-500">✉ {lead.email}</p>}
                            {(lead.city || lead.state) && (
                              <p className="text-xs text-gray-500">📍 {[lead.city, lead.state].filter(Boolean).join(", ")}</p>
                            )}
                            {lead.job_type && <p className="text-xs text-gray-500">🔧 {lead.job_type}</p>}
                          </div>
                        </div>
                        <button onClick={() => removeLead(idx)} className="text-gray-400 text-lg leading-none shrink-0 pt-0.5">×</button>
                      </div>
                    ))}
                  </div>

                  {leads.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">All leads removed.</p>
                  )}

                  <div className="pt-2 space-y-2">
                    <button
                      onClick={confirmImport}
                      disabled={leads.length === 0}
                      className="w-full rounded-xl py-3 text-white font-bold disabled:opacity-40"
                      style={{ backgroundColor: "#1B3A6B" }}
                    >
                      Import {leads.length} Lead{leads.length !== 1 ? "s" : ""}
                    </button>
                    <button onClick={reset} className="w-full rounded-xl py-3 text-gray-500 font-semibold bg-gray-50">
                      Start Over
                    </button>
                  </div>
                </div>
              )}

              {/* importing */}
              {step === "importing" && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-12 h-12 rounded-full border-4 border-green-200 border-t-green-600 animate-spin" />
                  <p className="text-sm font-semibold text-slate-600">Importing leads…</p>
                </div>
              )}

              {/* done */}
              {step === "done" && (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">✅</div>
                  <p className="text-xl font-bold text-slate-800">{importedCount} Lead{importedCount !== 1 ? "s" : ""} Imported</p>
                  <p className="text-sm text-gray-400">They're all in your pipeline as "New".</p>
                  <button
                    onClick={close}
                    className="mt-2 w-full rounded-xl py-3 text-white font-bold"
                    style={{ backgroundColor: "#1B3A6B" }}
                  >
                    View Leads
                  </button>
                </div>
              )}

              {/* error */}
              {step === "error" && (
                <div className="flex flex-col items-center py-8 gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-3xl">⚠️</div>
                  <p className="font-semibold text-slate-800">Something went wrong</p>
                  <p className="text-sm text-gray-500">{errorMsg}</p>
                  <button onClick={reset} className="w-full rounded-xl py-3 font-bold bg-gray-100 text-slate-700">
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
