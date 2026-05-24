"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Contractor } from "./mockData";

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
  hoveredId: string | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

function makeIcon(c: Contractor, active: boolean, selected: boolean) {
  const color = selected ? "#1B3A6B" : active ? c.avatar_color : c.avatar_color;
  const size = selected ? 46 : active ? 42 : 36;
  const border = selected ? "3px solid #F59E0B" : active ? "3px solid white" : "2.5px solid white";
  const shadow = selected
    ? "0 4px 16px rgba(27,58,107,0.5), 0 0 0 4px rgba(245,158,11,0.25)"
    : active
    ? "0 4px 12px rgba(0,0,0,0.4), 0 0 0 3px rgba(255,255,255,0.4)"
    : "0 2px 8px rgba(0,0,0,0.3)";
  const emoji = TRADE_EMOJI[c.trade] ?? "🔨";

  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:all 0.15s ease">
        <div style="
          width:${size}px;height:${size}px;
          background:${color};
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
          border:${border};
          box-shadow:${shadow};
          transition:all 0.15s ease;
        ">
          <span style="transform:rotate(45deg);font-size:${selected ? 15 : active ? 13 : 11}px;line-height:1">${emoji}</span>
        </div>
      </div>`,
    className: "",
    iconSize: [size, size + 6],
    iconAnchor: [size / 2, size + 6],
    popupAnchor: [0, -(size + 6)],
  });
}

export default function LeafletMap({ contractors, hoveredId, selectedId, onSelect, onHover }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const rafRef = useRef<number | null>(null);

  // ── Init map once ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
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
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      map.setMaxBounds(MAX_BOUNDS);
      map.setMinZoom(4);
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(contractors.map((c) => c.id));

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    contractors.forEach((c) => {
      const active = hoveredId === c.id;
      const selected = selectedId === c.id;
      const icon = makeIcon(c, active, selected);

      if (markersRef.current.has(c.id)) {
        markersRef.current.get(c.id)!.setIcon(icon);
      } else {
        const marker = L.marker([c.lat, c.lng], { icon })
          .addTo(map)
          .on("click", () => onSelect(selectedId === c.id ? null : c.id))
          .on("mouseover", () => onHover(c.id))
          .on("mouseout", () => onHover(null));
        markersRef.current.set(c.id, marker);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractors, hoveredId, selectedId]);

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
}
