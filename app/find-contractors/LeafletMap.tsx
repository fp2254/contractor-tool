"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Contractor } from "./mockData";
import type { RealtorPin } from "./page";

const DEFAULT_CENTER: L.LatLngExpression = [45.52, -122.68];
const DEFAULT_ZOOM = 11;
const MAX_BOUNDS: L.LatLngBoundsLiteral = [[24, -130], [52, -60]];

const TRADE_EMOJI: Record<string, string> = {
  Roofing: "🏠",
  Electrician: "⚡",
  Plumbing: "🔧",
  HVAC: "❄️",
  Painting: "🎨",
  Concrete: "🏗️",
  Gutters: "🌧️",
  "Tile & Flooring": "🪟",
};

interface Props {
  contractors: Contractor[];
  liveContractors?: Contractor[];
  realtors?: RealtorPin[];
  showRealtors?: boolean;
  hoveredId: string | null;
  selectedId: string | null;
  hasSelection: boolean;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

function makeRealtorIcon(): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
        <div style="
          width:36px;height:36px;
          background:#0F766E;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
          border:2.5px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
        ">
          <span style="transform:rotate(45deg);font-size:15px;line-height:1">🏡</span>
        </div>
      </div>`,
    className: "",
    iconSize: [36, 42],
    iconAnchor: [18, 42],
    popupAnchor: [0, -42],
  });
}

function makeRealtorTooltipHtml(r: RealtorPin): string {
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;width:200px;pointer-events:none;">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:32px;height:32px;border-radius:8px;background:#0F766E;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:13px;flex-shrink:0;">
          ${r.name.charAt(0)}
        </div>
        <div style="min-width:0;">
          <div style="font-weight:700;font-size:12px;color:#1E293B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.name}</div>
          <div style="font-size:10px;color:#64748B;">🏡 Realtor${r.agencyName ? " · " + r.agencyName : ""}</div>
        </div>
      </div>
      <div style="margin-top:6px;font-size:9px;color:#94A3B8;text-align:center;">Click pin to see full profile</div>
    </div>
  `;
}

function makeIcon(c: Contractor, active: boolean, selected: boolean, dimmed: boolean) {
  const color = selected ? "#1B3A6B" : c.avatar_color;
  const size = selected ? 48 : active ? 43 : 36;
  const border = selected
    ? "3.5px solid #F59E0B"
    : active
    ? "3px solid white"
    : "2.5px solid white";
  const shadow = selected
    ? "0 6px 20px rgba(27,58,107,0.55), 0 0 0 6px rgba(245,158,11,0.22)"
    : active
    ? "0 4px 14px rgba(0,0,0,0.45), 0 0 0 3px rgba(255,255,255,0.45)"
    : dimmed
    ? "0 1px 4px rgba(0,0,0,0.15)"
    : "0 2px 8px rgba(0,0,0,0.3)";
  const opacity = dimmed ? "0.32" : "1";
  const emoji = TRADE_EMOJI[c.trade] ?? "🔨";
  const bounce = selected ? "animation:pinBounce 0.38s cubic-bezier(.36,.07,.19,.97) both;" : "";
  const fs = selected ? 16 : active ? 14 : 11;

  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;opacity:${opacity};transition:opacity 0.2s ease;${bounce}">
        <div style="
          width:${size}px;height:${size}px;
          background:${color};
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
          border:${border};
          box-shadow:${shadow};
          transition:width 0.15s ease,height 0.15s ease,box-shadow 0.15s ease;
        ">
          <span style="transform:rotate(45deg);font-size:${fs}px;line-height:1">${emoji}</span>
        </div>
      </div>`,
    className: "",
    iconSize: [size, size + 6],
    iconAnchor: [size / 2, size + 6],
    popupAnchor: [0, -(size + 6)],
  });
}

function makeTooltipHtml(c: Contractor): string {
  const emoji = TRADE_EMOJI[c.trade] ?? "🔨";
  const stars = "★".repeat(Math.round(c.rating_google));
  const badges = [
    c.verified ? `<span style="background:#EFF6FF;color:#1D4ED8;padding:1px 5px;border-radius:4px;font-size:9px;font-weight:700;">✓ Verified</span>` : "",
    c.licensed ? `<span style="background:#F0FDF4;color:#15803D;padding:1px 5px;border-radius:4px;font-size:9px;font-weight:700;">🏛 Licensed</span>` : "",
    c.insured ? `<span style="background:#ECFDF5;color:#047857;padding:1px 5px;border-radius:4px;font-size:9px;font-weight:700;">🛡 Insured</span>` : "",
    c.emergency ? `<span style="background:#FEF2F2;color:#DC2626;padding:1px 5px;border-radius:4px;font-size:9px;font-weight:700;">⚡ 24/7</span>` : "",
  ].filter(Boolean).join(" ");

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;width:220px;pointer-events:none;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <div style="width:32px;height:32px;border-radius:8px;background:${c.avatar_color};display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:13px;flex-shrink:0;">
          ${c.name.charAt(0)}
        </div>
        <div style="min-width:0;">
          <div style="font-weight:700;font-size:12px;color:#1E293B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.name}</div>
          <div style="font-size:10px;color:#64748B;">${emoji} ${c.trade} · 📍 ${c.distance} mi</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:4px;margin-bottom:5px;">
        <span style="color:#FBBF24;font-size:11px;">${stars}</span>
        <span style="font-weight:700;font-size:11px;color:#1E293B;">${c.rating_google.toFixed(1)}</span>
        <span style="font-size:10px;color:#94A3B8;">(${c.reviews_google} reviews)</span>
      </div>
      ${badges ? `<div style="display:flex;gap:3px;flex-wrap:wrap;">${badges}</div>` : ""}
      ${c.tagline ? `<div style="font-size:10px;color:#64748B;margin-top:5px;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.tagline}</div>` : ""}
      <div style="margin-top:6px;font-size:9px;color:#94A3B8;text-align:center;">Click pin to see full profile</div>
    </div>
  `;
}

export default function LeafletMap({ contractors, liveContractors, realtors = [], showRealtors = true, hoveredId, selectedId, hasSelection, onSelect, onHover }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const tooltipsRef = useRef<Map<string, L.Tooltip>>(new Map());
  const realtorMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const rafRef = useRef<number | null>(null);
  // Capture liveContractors at mount time so init effect can use the correct initial center.
  const initialLiveRef = useRef<Contractor[] | undefined>(liveContractors);

  // Always-current refs for callbacks — prevents stale closures in marker handlers.
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onHoverRef.current = onHover; }, [onHover]);

  // Keep a ref to the current contractors array so flyTo can read it without
  // being in its deps (avoiding spurious fly calls on every hover/filter change).
  const contractorsRef = useRef(contractors);
  useEffect(() => { contractorsRef.current = contractors; }, [contractors]);

  // Pan to selected contractor ONLY when selectedId changes, not on every
  // contractors-array reference change (which was causing the map to snap back).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const c = contractorsRef.current.find((x) => x.id === selectedId);
    if (c) map.flyTo([c.lat, c.lng], Math.max(map.getZoom(), 12), { animate: true, duration: 0.8 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "leaflet-pin-anim";
    style.textContent = `
      @keyframes pinBounce {
        0%   { transform: scale(1) translateY(0); }
        25%  { transform: scale(1.25) translateY(-8px); }
        55%  { transform: scale(0.94) translateY(2px); }
        75%  { transform: scale(1.07) translateY(-3px); }
        100% { transform: scale(1) translateY(0); }
      }
      .leaflet-tooltip.pin-tooltip {
        background: white;
        border: 1px solid rgba(0,0,0,0.08);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
        padding: 10px 12px;
        pointer-events: none;
      }
      .leaflet-tooltip.pin-tooltip::before {
        border-top-color: white;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.12));
      }
    `;
    if (!document.getElementById("leaflet-pin-anim")) {
      document.head.appendChild(style);
    }
    return () => {
      const existing = document.getElementById("leaflet-pin-anim");
      if (existing) existing.remove();
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const live = initialLiveRef.current;
    const center: L.LatLngExpression = live?.length
      ? [
          live.reduce((s, c) => s + c.lat, 0) / live.length,
          live.reduce((s, c) => s + c.lng, 0) / live.length,
        ]
      : DEFAULT_CENTER;

    const map = L.map(containerRef.current, {
      center,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    rafRef.current = requestAnimationFrame(() => {
      map.invalidateSize();
      map.setMaxBounds(MAX_BOUNDS);
      map.setMinZoom(4);
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      tooltipsRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(contractors.map((c) => c.id));

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
        tooltipsRef.current.delete(id);
      }
    });

    contractors.forEach((c) => {
      const active = hoveredId === c.id;
      const selected = selectedId === c.id;
      const dimmed = hasSelection && !selected && !active;
      const icon = makeIcon(c, active, selected, dimmed);

      if (markersRef.current.has(c.id)) {
        markersRef.current.get(c.id)!.setIcon(icon);
        // Update tooltip content in case rating etc changed
        const tt = tooltipsRef.current.get(c.id);
        if (tt) tt.setContent(makeTooltipHtml(c));
      } else {
        const tooltip = L.tooltip({
          permanent: false,
          direction: "top",
          offset: [0, -4],
          className: "pin-tooltip",
          opacity: 1,
        }).setContent(makeTooltipHtml(c));

        const marker = L.marker([c.lat, c.lng], { icon })
          .addTo(map)
          .bindTooltip(tooltip)
          .on("click", () => onSelectRef.current(c.id))
          .on("mouseover", () => onHoverRef.current(c.id))
          .on("mouseout", () => onHoverRef.current(null));

        markersRef.current.set(c.id, marker);
        tooltipsRef.current.set(c.id, tooltip);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractors, hoveredId, selectedId, hasSelection]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const active = showRealtors ? realtors : [];
    const currentIds = new Set(active.map((r) => r.id));

    realtorMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        realtorMarkersRef.current.delete(id);
      }
    });

    active.forEach((r) => {
      if (realtorMarkersRef.current.has(r.id)) return;

      const marker = L.marker([r.lat, r.lng], { icon: makeRealtorIcon() })
        .addTo(map)
        .bindTooltip(
          L.tooltip({ permanent: false, direction: "top", offset: [0, -4], className: "pin-tooltip", opacity: 1 }).setContent(
            makeRealtorTooltipHtml(r)
          )
        )
        .on("click", () => window.open(`/agent/${r.slug}`, "_blank"));

      realtorMarkersRef.current.set(r.id, marker);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtors, showRealtors]);

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
}
