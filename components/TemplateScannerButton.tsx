"use client";

import { useRef, useState } from "react";
import type { TemplateScanResult } from "@/app/api/ai/template-scan/route";

interface Props {
  onExtracted: (data: TemplateScanResult) => void;
}

export function TemplateScannerButton({ onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  function readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setError("");
    try {
      const dataUrl = await readAsDataURL(file);
      setPreview(dataUrl);
      await scan(dataUrl);
    } catch {
      setError("Could not read image — please try again.");
    }
  }

  async function scan(dataUrl: string) {
    setScanning(true);
    setError("");
    try {
      const res = await fetch("/api/ai/template-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_data_url: dataUrl }),
      });
      const json = await res.json() as TemplateScanResult & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Scan failed");
      onExtracted(json);
      setOpen(false);
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed — please try again.");
    } finally {
      setScanning(false);
    }
  }

  function handleClose() {
    if (scanning) return;
    setOpen(false);
    setPreview(null);
    setError("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#1B3A6B] bg-blue-50 py-3 text-sm font-semibold text-[#1B3A6B] active:bg-blue-100 transition-colors">
        <span className="text-base leading-none">✨</span>
        Scan or Upload a Template
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
          <div className="relative bg-white rounded-t-3xl shadow-xl p-5 pb-10 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-base font-bold text-slate-800">Scan a Template</p>
                <p className="text-xs text-gray-500 mt-0.5">Photo or upload a paper form — AI will read it and fill in the fields</p>
              </div>
              <button onClick={handleClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
                {error}
              </div>
            )}

            {scanning ? (
              <div className="flex flex-col items-center gap-3 py-8">
                {preview && (
                  <img src={preview} alt="scanning" className="w-40 h-40 object-cover rounded-xl opacity-60" />
                )}
                <div className="flex items-center gap-2 text-[#1B3A6B]">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span className="text-sm font-semibold">Reading your template…</span>
                </div>
                <p className="text-xs text-gray-400">AI is extracting fields, line items, and warranty info</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full border-2 border-dashed border-blue-200 rounded-2xl py-10 flex flex-col items-center gap-3 bg-blue-50 active:bg-blue-100 transition-colors">
                <span className="text-4xl">📄</span>
                <div className="text-center">
                  <p className="text-sm font-bold text-[#1B3A6B]">Take Photo or Upload</p>
                  <p className="text-xs text-gray-400 mt-0.5">Paper forms, checklists, existing templates</p>
                  <p className="text-xs text-gray-400">JPG, PNG, PDF screenshots, or any image</p>
                </div>
              </button>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              style={{ position: "fixed", top: "-200px", left: 0, width: "1px", height: "1px", opacity: 0 }}
            />
          </div>
        </div>
      )}
    </>
  );
}
