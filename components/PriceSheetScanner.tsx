"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type ScannedService = {
  service_name: string;
  description: string;
  price_type: "flat" | "hourly";
  flat_rate: number | null;
  hourly_rate: number | null;
  unit: string;
  category: string;
};

type ReviewItem = ScannedService & {
  selected: boolean;
  editedPrice: string;
};

type Props = {
  /** Called with scanned items instead of saving to DB — used inside the wizard */
  onScanned?: (items: { name: string; price: number }[]) => void;
};

function Checkmark() {
  return (
    <svg viewBox="0 0 12 10" className="w-3 h-2.5" fill="none">
      <path d="M1 5l3 3 7-7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PriceSheetScanner({ onScanned }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "scanning" | "review" | "saving" | "done">("idle");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setPhase("scanning");
    setError(null);

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target!.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    try {
      const res = await fetch("/api/ai/price-sheet-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_data_url: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");

      const scanned: ScannedService[] = data.services ?? [];
      if (scanned.length === 0) {
        setError("No services found — try a clearer photo of your price list.");
        setPhase("idle");
        return;
      }

      setItems(scanned.map(s => ({
        ...s,
        selected: true,
        editedPrice: s.price_type === "hourly"
          ? String(s.hourly_rate ?? "")
          : String(s.flat_rate ?? ""),
      })));
      setPhase("review");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Scan failed");
      setPhase("idle");
    }
  }

  async function handleSave() {
    const toSave = items.filter(i => i.selected);
    if (toSave.length === 0) return;

    const presets = toSave.map(i => ({
      name: i.service_name,
      price: parseFloat(i.editedPrice) || 0,
    }));

    if (onScanned) {
      onScanned(presets);
      setPhase("idle");
      setItems([]);
      return;
    }

    setPhase("saving");
    try {
      await fetch("/api/setup-wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", presets }),
      });
      setPhase("done");
      router.refresh();
    } catch {
      setError("Failed to save — please try again.");
      setPhase("review");
    }
  }

  const selectedCount = items.filter(i => i.selected).length;

  if (phase === "done") {
    return (
      <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-4 text-sm">
        <span className="text-xl shrink-0">✅</span>
        <div>
          <p className="font-semibold text-green-800">Presets imported!</p>
          <p className="text-xs text-green-600 mt-0.5">Your services are saved and ready to use in quotes.</p>
          <button onClick={() => setPhase("idle")} className="text-xs text-green-700 font-semibold underline mt-1.5">
            Scan another sheet
          </button>
        </div>
      </div>
    );
  }

  if (phase === "scanning") {
    return (
      <div className="flex flex-col items-center justify-center bg-blue-50 border border-blue-100 rounded-2xl py-8 px-4 text-center">
        <div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-blue-700">Scanning price sheet…</p>
        <p className="text-xs text-blue-500 mt-1">AI is extracting your services and prices</p>
      </div>
    );
  }

  if (phase === "review") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <p className="text-sm font-semibold text-gray-700">
            {items.length} service{items.length !== 1 ? "s" : ""} found — review and adjust prices
          </p>
          <button onClick={() => setPhase("idle")} className="text-xs text-gray-400 hover:text-gray-600">
            Rescan
          </button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-white rounded-xl border-2 px-3 py-3 transition-colors"
              style={{ borderColor: item.selected ? "#1B3A6B" : "#F3F4F6" }}
            >
              <button
                onClick={() => setItems(ps => ps.map((x, j) => j === i ? { ...x, selected: !x.selected } : x))}
                className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0"
                style={{
                  borderColor: item.selected ? "#1B3A6B" : "#D1D5DB",
                  backgroundColor: item.selected ? "#1B3A6B" : "white",
                }}
              >
                {item.selected && <Checkmark />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.service_name}</p>
                {item.category && (
                  <p className="text-[11px] text-gray-400 capitalize">{item.category}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-gray-400">$</span>
                <input
                  type="number"
                  value={item.editedPrice}
                  onChange={e => setItems(ps => ps.map((x, j) => j === i ? { ...x, editedPrice: e.target.value } : x))}
                  placeholder="0"
                  className="w-20 text-right text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-100"
                />
                {item.price_type === "hourly" && (
                  <span className="text-[10px] text-gray-400">/hr</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setItems(ps => ps.map(x => ({ ...x, selected: true })))}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Select all
          </button>
          <button
            onClick={handleSave}
            disabled={selectedCount === 0 || phase === "saving"}
            className="flex-1 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: "#1B3A6B" }}
          >
            {phase === "saving"
              ? "Saving…"
              : onScanned
                ? `Use ${selectedCount} Preset${selectedCount !== 1 ? "s" : ""} →`
                : `Add ${selectedCount} Preset${selectedCount !== 1 ? "s" : ""} to Settings →`
            }
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-xs text-red-700 font-medium">
          ⚠️ {error}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          (e.target as HTMLInputElement).value = "";
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border-2 border-dashed border-blue-200 text-sm font-semibold text-blue-600 bg-blue-50 active:bg-blue-100 transition-colors"
      >
        <span className="text-lg">📸</span>
        Scan Price Sheet
      </button>
      <p className="text-[11px] text-gray-400 text-center mt-2 leading-relaxed">
        Take a photo or upload an image of your price list — AI extracts every service and price automatically.
      </p>
    </div>
  );
}
