"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Contractor } from "./mockData";

// Portland, OR — where the mock contractors are (city-level default)
const DEFAULT_CENTER: L.LatLngExpression = [45.52, -122.68];
const DEFAULT_ZOOM = 10;
const MAX_BOUNDS: L.LatLngBoundsLiteral = [[24, -130], [52, -60]];

interface Props {
  contractors: Contractor[];
  hoveredId: string | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

function makeIcon(c: Contractor, active: boolean, selected: boolean) {
  const bg = selected || active ? "#1B3A6B" : c.avatar_color;
  const scale = selected || active ? 1.15 : 1;
  return L.divIcon({
    html: `<div style="transform:scale(${scale});transform-origin:bottom center;transition:transform 0.15s;display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.35));cursor:pointer">
      <div style="background:${bg};color:white;font-weight:800;font-size:12px;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25)">
        <span style="transform:rotate(45deg)">${c.name.charAt(0)}</span>
      </div>
    </div>`,
    className: "",
    iconSize: [36, 42],
    iconAnchor: [18, 42],
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

    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add or update
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

      // Open/close popup on selected marker
      const marker = markersRef.current.get(c.id)!;
      if (selected) {
        if (!marker.getPopup()) {
          marker.bindPopup(
            `<div style="min-width:180px;font-family:sans-serif;padding:4px">
              <p style="font-weight:700;font-size:14px;margin:0 0 2px">${c.name}</p>
              <p style="font-size:12px;color:#64748b;margin:0 0 6px">${c.trade} · ${c.city}</p>
              <p style="font-size:12px;margin:0 0 8px">⭐ ${c.rating_google} (${c.reviews_google} reviews)</p>
              <a href="/pro/${c.slug}" style="display:block;border:1.5px solid #e2e8f0;border-radius:8px;padding:6px;text-align:center;font-size:11px;font-weight:700;color:#475569;text-decoration:none">View Profile</a>
            </div>`,
            { offset: [0, -42], closeButton: false }
          );
        }
        marker.openPopup();
      } else {
        marker.closePopup();
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
