"use client";

import { useRef, useState } from "react";
import type { CardScanResult } from "@/app/api/ai/card-scan/route";

interface Props {
  onExtracted: (data: CardScanResult) => void;
  onCancel: () => void;
}

export function BusinessCardScanner({ onExtracted, onCancel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  function resizeImage(file: File, maxPx = 1200, quality = 0.82): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("canvas")); return; }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const dataUrl = await resizeImage(file);
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
      const res = await fetch("/api/ai/card-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_data_url: dataUrl }),
      });
      const json = await res.json() as CardScanResult & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Scan failed");
      onExtracted(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed — please try again.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-3">
      {!preview && !scanning && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-blue-200 rounded-2xl py-10 flex flex-col items-center gap-3 bg-blue-50 active:bg-blue-100">
            <svg className="w-10 h-10 text-[#1B3A6B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-bold text-[#1B3A6B]">Take Photo or Upload</p>
              <p className="text-xs text-gray-400 mt-0.5">Point your camera at a business card</p>
            </div>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            style={{ position: "fixed", top: "-200px", left: 0, width: "1px", height: "1px", opacity: 0 }}
          />
        </>
      )}

      {scanning && (
        <div className="bg-blue-50 rounded-2xl py-12 flex flex-col items-center gap-4">
          {preview && (
            <img src={preview} alt="Card preview" className="w-48 h-28 object-cover rounded-xl shadow-sm opacity-60" />
          )}
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-[#1B3A6B] animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-sm font-semibold text-[#1B3A6B]">Reading card…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="space-y-3">
          {preview && (
            <img src={preview} alt="Card preview" className="w-full h-36 object-cover rounded-xl shadow-sm" />
          )}
          <p className="text-sm text-red-600 text-center">{error}</p>
          <button
            type="button"
            onClick={() => { setPreview(null); setError(""); inputRef.current?.click(); }}
            className="w-full rounded-xl py-2.5 border border-gray-200 text-sm font-semibold text-slate-600">
            Try Again
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="w-full rounded-xl py-2 text-sm text-gray-400">
        Cancel
      </button>
    </div>
  );
}
