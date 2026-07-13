"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import type { ContractorPin } from "./page";

const TRADE_EMOJI: Record<string, string> = {
  Roofing: "🏠", Electrician: "⚡", Plumbing: "🔧", HVAC: "❄️",
  Painting: "🎨", Concrete: "🏗️", Gutters: "🌧️", "Tile & Flooring": "🪟",
};

// ── Leaflet map (loaded client-only) ────────────────────────────────────────

function MapCore({
  pins, selectedId, onSelect,
}: {
  pins: ContractorPin[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamic import to avoid SSR issues
    import("leaflet").then((L) => {

      const center = pins.length
        ? [
            pins.reduce((s, p) => s + p.lat, 0) / pins.length,
            pins.reduce((s, p) => s + p.lng, 0) / pins.length,
          ] as [number, number]
        : [39.5, -98.35] as [number, number];

      const map = L.map(containerRef.current!, {
        center,
        zoom: pins.length ? 5 : 4,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // Add style for tooltips
      const style = document.createElement("style");
      style.textContent = `
        .rm-tooltip { background:white!important; border:1px solid rgba(0,0,0,0.08)!important; border-radius:12px!important; box-shadow:0 8px 24px rgba(0,0,0,0.15)!important; padding:10px 12px!important; }
        .rm-tooltip::before { border-top-color:white!important; }
      `;
      document.head.appendChild(style);

      requestAnimationFrame(() => map.invalidateSize());

      pins.forEach((pin) => {
        const emoji = TRADE_EMOJI[pin.trade] ?? "🔨";
        const icon = L.divIcon({
          html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
            <div style="width:36px;height:36px;background:${pin.avatarColor};border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.28);">
              <span style="transform:rotate(45deg);font-size:14px;line-height:1">${emoji}</span>
            </div>
          </div>`,
          className: "",
          iconSize: [36, 42],
          iconAnchor: [18, 42],
          popupAnchor: [0, -42],
        });

        const tooltip = L.tooltip({
          permanent: false, direction: "top", offset: [0, -4],
          className: "rm-tooltip", opacity: 1,
        }).setContent(`
          <div style="font-family:system-ui,sans-serif;width:180px;">
            <div style="font-weight:700;font-size:12px;color:#1E293B;">${pin.name}</div>
            <div style="font-size:10px;color:#64748B;margin-top:2px;">${TRADE_EMOJI[pin.trade] ?? "🔨"} ${pin.trade}${pin.location ? " · 📍 " + pin.location : ""}</div>
            <div style="font-size:9px;color:#94A3B8;margin-top:5px;text-align:center;">Tap to view details</div>
          </div>`);

        const marker = L.marker([pin.lat, pin.lng], { icon })
          .addTo(map)
          .bindTooltip(tooltip)
          .on("click", () => onSelect(pin.id));

        markersRef.current.set(pin.id, marker);
      });

      return () => {
        map.remove();
        mapRef.current = null;
        markersRef.current.clear();
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to selected
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const pin = pins.find((p) => p.id === selectedId);
    if (pin) mapRef.current.flyTo([pin.lat, pin.lng], Math.max(mapRef.current.getZoom(), 12), { animate: true, duration: 0.6 });
  }, [selectedId, pins]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}

const MapCoreNoSSR = dynamic(() => Promise.resolve(MapCore), { ssr: false, loading: () => (
  <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
    <p className="text-sm text-gray-400 animate-pulse">Loading map…</p>
  </div>
)});

// ── Floating detail card ─────────────────────────────────────────────────────

function DetailCard({ pin, onClose }: { pin: ContractorPin; onClose: () => void }) {
  return (
    <div
      className="absolute bottom-6 left-1/2 z-[500] w-[340px] rounded-2xl overflow-hidden border border-white/60"
      style={{
        transform: "translateX(-50%)",
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.08)",
        animation: "floatUp 0.2s cubic-bezier(0.16,1,0.3,1) both",
      }}
    >
      <style>{`@keyframes floatUp { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>

      <div className="px-4 pt-4 pb-4">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center hover:bg-gray-200 transition-colors"
        >✕</button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-3 pr-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: pin.avatarColor }}
          >
            {pin.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 text-sm leading-tight truncate">{pin.name}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {TRADE_EMOJI[pin.trade] ?? "🔨"} {pin.trade}
              {pin.location ? ` · 📍 ${pin.location}` : ""}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {pin.licensed && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">🏛 Licensed</span>
          )}
          {pin.insured && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">🛡 Insured</span>
          )}
          {pin.rating > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
              ★ {pin.rating.toFixed(1)} ({pin.reviewCount})
            </span>
          )}
        </div>

        {pin.tagline && (
          <p className="text-[11px] text-gray-500 italic mb-3 line-clamp-2">&ldquo;{pin.tagline}&rdquo;</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/pro/${pin.slug}`}
            target="_blank"
            className="flex-1 rounded-xl py-2.5 text-center text-xs font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1B3A6B" }}
          >
            View Profile ↗
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export default function RealtorMapClient({ contractors }: { contractors: ContractorPin[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  const filtered = useMemo(() => {
    if (!query.trim()) return contractors;
    const q = query.toLowerCase();
    return contractors.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.trade.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)
    );
  }, [contractors, query]);

  const selected = selectedId ? filtered.find((c) => c.id === selectedId) ?? null : null;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedId(null); }}
            placeholder="Search by name, trade, or city…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
          )}
        </div>
        <span className="text-xs font-semibold text-gray-500 shrink-0">
          {filtered.length} contractor{filtered.length !== 1 ? "s" : ""}
        </span>

        {/* Mobile list/map toggle */}
        <div className="lg:hidden flex rounded-xl border border-gray-200 overflow-hidden shrink-0">
          <button onClick={() => setMobileView("map")} className={`px-3 py-1.5 text-xs font-semibold transition-colors ${mobileView === "map" ? "bg-[#1B3A6B] text-white" : "text-gray-500"}`}>Map</button>
          <button onClick={() => setMobileView("list")} className={`px-3 py-1.5 text-xs font-semibold transition-colors ${mobileView === "list" ? "bg-[#1B3A6B] text-white" : "text-gray-500"}`}>List</button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar list — hidden on mobile when in map view */}
        <div className={`${mobileView === "list" ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-80 xl:w-96 border-r border-gray-100 bg-white overflow-y-auto shrink-0`}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 px-6 text-center py-12">
              <p className="text-2xl mb-2">🔍</p>
              <p className="font-semibold text-slate-700 text-sm">No contractors found</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search term.</p>
              <button onClick={() => setQuery("")} className="mt-3 text-xs font-semibold text-blue-600 hover:underline">Clear search</button>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedId((prev) => prev === c.id ? null : c.id); setMobileView("map"); }}
                  className={`w-full text-left rounded-xl px-3.5 py-3 border transition-all ${
                    selectedId === c.id
                      ? "border-[#1B3A6B] bg-blue-50 shadow-sm"
                      : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: c.avatarColor }}>
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-[13px] leading-tight truncate">{c.name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                        {TRADE_EMOJI[c.trade] ?? "🔨"} {c.trade}{c.location ? ` · ${c.location}` : ""}
                      </p>
                    </div>
                    {c.rating > 0 && (
                      <span className="text-[10px] font-bold text-amber-600 shrink-0">★ {c.rating.toFixed(1)}</span>
                    )}
                  </div>
                  {(c.licensed || c.insured) && (
                    <div className="flex gap-1.5 mt-2 ml-12">
                      {c.licensed && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">Licensed</span>}
                      {c.insured && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Insured</span>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className={`${mobileView === "map" ? "flex" : "hidden"} lg:flex relative flex-1 min-h-0`}>
          <MapCoreNoSSR pins={filtered} selectedId={selectedId} onSelect={(id) => setSelectedId((prev) => prev === id ? null : id)} />

          {selected && (
            <DetailCard pin={selected} onClose={() => setSelectedId(null)} />
          )}

          {!selected && (
            <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm border border-gray-100 pointer-events-none">
              <p className="text-[10px] font-semibold text-slate-600">Tap a pin to preview</p>
            </div>
          )}

          {filtered.length === 0 && query && (
            <div className="absolute inset-0 flex items-center justify-center z-[400] pointer-events-none">
              <div className="bg-white/95 rounded-2xl px-6 py-5 shadow-lg text-center">
                <p className="text-lg mb-1">🔍</p>
                <p className="font-semibold text-slate-700 text-sm">No results for &ldquo;{query}&rdquo;</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
