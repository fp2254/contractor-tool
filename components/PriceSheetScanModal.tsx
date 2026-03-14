"use client";

import { useRef, useState, useTransition } from "react";
import { bulkCreatePresets, type BulkPresetItem } from "@/app/app/profile/actions";
import type { ScannedService } from "@/app/api/ai/price-sheet-scan/route";

type Step = "upload" | "scanning" | "review" | "done";

interface ReviewItem extends ScannedService {
  selected: boolean;
  flat_rate_str: string;
  hourly_rate_str: string;
}

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export function PriceSheetScanModal({ onClose, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImageDataUrl(dataUrl);
      setPreviewUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function handleScan() {
    if (!imageDataUrl) return;
    setError(null);
    setStep("scanning");
    try {
      const res = await fetch("/api/ai/price-sheet-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_data_url: imageDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      const services: ScannedService[] = data.services ?? [];
      if (services.length === 0) {
        setError("No services found in this image. Try a clearer photo of your pricing sheet.");
        setStep("upload");
        return;
      }
      setItems(
        services.map((s) => ({
          ...s,
          selected: true,
          flat_rate_str: s.flat_rate != null ? String(s.flat_rate) : "",
          hourly_rate_str: s.hourly_rate != null ? String(s.hourly_rate) : "",
        }))
      );
      setStep("review");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
      setStep("upload");
    }
  }

  function updateItem(idx: number, patch: Partial<ReviewItem>) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  function handleImport() {
    const selected = items.filter((i) => i.selected && i.service_name.trim());
    if (selected.length === 0) return;
    startTransition(async () => {
      const payload: BulkPresetItem[] = selected.map((i) => ({
        service_name: i.service_name,
        description: i.description,
        price_type: i.price_type,
        flat_rate: i.price_type === "flat" && i.flat_rate_str ? parseFloat(i.flat_rate_str) : null,
        hourly_rate: i.price_type === "hourly" && i.hourly_rate_str ? parseFloat(i.hourly_rate_str) : null,
        unit: i.unit,
        category: i.category,
      }));
      await bulkCreatePresets(payload);
      setStep("done");
      onImported();
    });
  }

  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Scan Pricing Sheet</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === "upload" && "Upload a photo of your price list"}
              {step === "scanning" && "AI is reading your pricing sheet…"}
              {step === "review" && `${items.length} service${items.length !== 1 ? "s" : ""} found — review and import`}
              {step === "done" && "Services imported successfully"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none px-1">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* UPLOAD STEP */}
          {step === "upload" && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ position: "fixed", top: -200, width: 1, height: 1, opacity: 0 }}
              />

              {!previewUrl ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center gap-3 text-gray-400 active:bg-gray-50">
                  <span className="text-5xl">📋</span>
                  <span className="text-sm font-semibold text-slate-600">Tap to upload pricing sheet</span>
                  <span className="text-xs">Photo, screenshot, or scanned PDF image</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden border border-gray-100">
                    <img src={previewUrl} alt="Pricing sheet" className="w-full object-contain max-h-64" />
                    <button
                      onClick={() => { setPreviewUrl(null); setImageDataUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">
                      ✕
                    </button>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[#1B3A6B] font-semibold underline">
                    Choose a different image
                  </button>
                </div>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
            </>
          )}

          {/* SCANNING STEP */}
          {step === "scanning" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="text-4xl animate-pulse">🤖</div>
              <p className="text-sm font-semibold text-slate-700">Reading your pricing sheet…</p>
              <p className="text-xs text-gray-400">This takes about 10–15 seconds</p>
            </div>
          )}

          {/* REVIEW STEP */}
          {step === "review" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500">
                  {selectedCount} of {items.length} selected
                </p>
                <button
                  onClick={() => setItems((prev) => prev.map((i) => ({ ...i, selected: selectedCount < items.length })))}
                  className="text-xs text-[#1B3A6B] font-semibold underline">
                  {selectedCount < items.length ? "Select all" : "Deselect all"}
                </button>
              </div>

              {items.map((item, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border-2 p-3 space-y-2 transition-colors ${item.selected ? "border-[#1B3A6B] bg-blue-50/40" : "border-gray-100 bg-gray-50 opacity-60"}`}>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => updateItem(idx, { selected: !item.selected })}
                      className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${item.selected ? "border-[#1B3A6B] bg-[#1B3A6B]" : "border-gray-300 bg-white"}`}>
                      {item.selected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <input
                        value={item.service_name}
                        onChange={(e) => updateItem(idx, { service_name: e.target.value })}
                        className="w-full text-sm font-semibold text-slate-800 bg-transparent border-b border-transparent focus:border-blue-300 focus:outline-none pb-0.5"
                      />
                      {item.category && (
                        <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 font-medium mt-1 inline-block">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-8">
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 mb-0.5">{item.price_type === "flat" ? "Flat Rate ($)" : "Hourly Rate ($)"}</p>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price_type === "flat" ? item.flat_rate_str : item.hourly_rate_str}
                        onChange={(e) =>
                          updateItem(idx, item.price_type === "flat"
                            ? { flat_rate_str: e.target.value }
                            : { hourly_rate_str: e.target.value }
                          )
                        }
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400 bg-white"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Unit</p>
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(idx, { unit: e.target.value })}
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400 bg-white">
                        {["job", "each", "sqft", "lf", "hr", "ft", "day"].map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DONE STEP */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="text-5xl">✅</div>
              <p className="text-base font-bold text-slate-800">All done!</p>
              <p className="text-sm text-gray-500 text-center">
                {selectedCount} service{selectedCount !== 1 ? "s" : ""} added to your pricing sheet.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 pb-8 pt-3 border-t border-gray-100 space-y-2">
          {step === "upload" && previewUrl && (
            <button
              onClick={handleScan}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: "#1B3A6B" }}>
              Extract Services with AI
            </button>
          )}
          {step === "review" && (
            <button
              onClick={handleImport}
              disabled={isPending || selectedCount === 0}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: "#1B3A6B" }}>
              {isPending ? "Importing…" : `Import ${selectedCount} Service${selectedCount !== 1 ? "s" : ""}`}
            </button>
          )}
          {step === "done" ? (
            <button
              onClick={onClose}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: "#1B3A6B" }}>
              Done
            </button>
          ) : (
            <button
              onClick={onClose}
              disabled={step === "scanning"}
              className="w-full rounded-xl py-3 text-sm font-semibold text-gray-500 border border-gray-200 disabled:opacity-40">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
