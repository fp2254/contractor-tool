"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Contractor } from "./mockData";

interface Props {
  contractors: Contractor[];
  hoveredId: string | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

export default function LeafletMap({ contractors, hoveredId, selectedId, onSelect, onHover }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const popupRef = useRef<any>(null);

  // Build styled marker HTML
  function markerHtml(c: Contractor, active: boolean, selected: boolean) {
    const bg = selected ? "#1B3A6B" : active ? "#1B3A6B" : c.avatar_color;
    const scale = selected || active ? 1.15 : 1;
    return `
      <div style="
        transform: scale(${scale}) translateX(-50%);
        transform-origin: bottom center;
        transition: transform 0.15s;
        display: flex;
        flex-direction: column;
        align-items: center;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.35));
        cursor: pointer;
      ">
        <div style="
          background: ${bg};
          color: white;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 11px;
          font-weight: 800;
          padding: 5px 10px;
          border-radius: 10px;
          white-space: nowrap;
          border: 2px solid white;
          ${selected ? "box-shadow: 0 0 0 3px #1B3A6B;" : ""}
        ">${c.name.split(" ")[0]}</div>
        <div style="
          width: 0; height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid ${bg};
          margin-top: -1px;
        "></div>
      </div>`;
  }

  function popupHtml(c: Contractor) {
    return `
      <div style="font-family: system-ui, -apple-system, sans-serif; width: 220px; padding: 0; border-radius: 14px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, ${c.avatar_color}, ${c.avatar_color}cc); height: 70px; display:flex; align-items:center; justify-content:center; position:relative;">
          <span style="font-size:36px; opacity:0.25;">${c.cover_emoji}</span>
          <div style="position:absolute; bottom:-14px; left:12px; width:28px; height:28px; background:${c.avatar_color}; border-radius:7px; border:2px solid white; display:flex; align-items:center; justify-content:center; color:white; font-weight:900; font-size:12px;">${c.name.charAt(0)}</div>
        </div>
        <div style="padding: 20px 12px 12px;">
          <div style="font-weight:800; font-size:13px; color:#1e293b; margin-bottom:4px;">${c.name}</div>
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:6px;">
            <span style="font-size:10px; font-weight:700; background:#EFF6FF; color:#1B3A6B; border-radius:6px; padding:2px 6px;">${c.trade}</span>
            <span style="font-size:11px; color:#F59E0B;">★</span><span style="font-size:11px; font-weight:700;">${c.rating_google.toFixed(1)}</span>
            <span style="font-size:10px; color:#94a3b8;">· ${c.distance} mi</span>
          </div>
          <div style="display:flex; gap:4px; flex-wrap:wrap; margin-bottom:10px;">
            ${c.verified ? `<span style="font-size:10px; font-weight:700; background:#EFF6FF; color:#1B3A6B; border-radius:5px; padding:2px 5px;">✓ Verified</span>` : ""}
            ${c.licensed ? `<span style="font-size:10px; font-weight:700; background:#f0fdf4; color:#16a34a; border-radius:5px; padding:2px 5px;">Licensed</span>` : ""}
            ${c.insured ? `<span style="font-size:10px; font-weight:700; background:#f0fdf4; color:#16a34a; border-radius:5px; padding:2px 5px;">Insured</span>` : ""}
          </div>
          <div style="display:flex; gap:6px;">
            <a href="/pro/${c.slug}" style="flex:1; border:1.5px solid #e2e8f0; border-radius:8px; padding:6px; text-align:center; font-size:11px; font-weight:700; color:#475569; text-decoration:none; display:block;">View Profile</a>
            <a href="/find-contractors" style="flex:1; background:#1B3A6B; border-radius:8px; padding:6px; text-align:center; font-size:11px; font-weight:700; color:white; text-decoration:none; display:block;">Get Quote</a>
          </div>
        </div>
      </div>`;
  }

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    (async () => {
      const L = (await import("leaflet")).default;

      const map = L.map(containerRef.current!, {
        center: [45.505, -122.675],
        zoom: 11,
        zoomControl: true,
        attributionControl: true,
      });

      // Ensure map sizes correctly after flex layout settles
      requestAnimationFrame(() => map.invalidateSize());

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      mapRef.current = map;

      // Add markers
      contractors.forEach((c) => {
        const icon = L.divIcon({
          html: markerHtml(c, false, false),
          className: "",
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        const marker = L.marker([c.lat, c.lng], { icon })
          .addTo(map)
          .on("click", () => {
            onSelect(c.id);
          })
          .on("mouseover", () => onHover(c.id))
          .on("mouseout", () => onHover(null));
        markersRef.current[c.id] = marker;
      });
    })();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when list changes (filter)
  useEffect(() => {
    if (!mapRef.current) return;
    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      const visibleIds = new Set(contractors.map((c) => c.id));

      // Remove markers not in filtered list
      Object.keys(markersRef.current).forEach((id) => {
        if (!visibleIds.has(id)) {
          markersRef.current[id].remove();
          delete markersRef.current[id];
        }
      });

      // Add new markers
      contractors.forEach((c) => {
        if (!markersRef.current[c.id]) {
          const icon = L.divIcon({
            html: markerHtml(c, false, false),
            className: "",
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          });
          const marker = L.marker([c.lat, c.lng], { icon })
            .addTo(map)
            .on("click", () => onSelect(c.id))
            .on("mouseover", () => onHover(c.id))
            .on("mouseout", () => onHover(null));
          markersRef.current[c.id] = marker;
        }
      });

      // Fit bounds
      if (contractors.length > 0) {
        const bounds = L.latLngBounds(contractors.map((c) => [c.lat, c.lng]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    })();
  }, [contractors, onSelect, onHover]);

  // Update marker icons on hover/select change
  useEffect(() => {
    if (!mapRef.current) return;
    (async () => {
      const L = (await import("leaflet")).default;
      contractors.forEach((c) => {
        const marker = markersRef.current[c.id];
        if (!marker) return;
        const active = hoveredId === c.id;
        const selected = selectedId === c.id;
        marker.setIcon(
          L.divIcon({
            html: markerHtml(c, active, selected),
            className: "",
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })
        );
      });
    })();
  }, [hoveredId, selectedId, contractors]);

  // Show/hide popup on select
  useEffect(() => {
    if (!mapRef.current) return;
    (async () => {
      const L = (await import("leaflet")).default;
      // Close existing popup
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      if (!selectedId) return;
      const c = contractors.find((x) => x.id === selectedId);
      if (!c) return;
      const popup = L.popup({
        offset: [0, -18],
        className: "tb-contractor-popup",
        closeButton: false,
        maxWidth: 240,
      })
        .setLatLng([c.lat, c.lng])
        .setContent(popupHtml(c))
        .openOn(mapRef.current);
      popupRef.current = popup;
    })();
  }, [selectedId, contractors]);

  return (
    <div className="absolute inset-0 rounded-2xl overflow-hidden">
      <style>{`
        .tb-contractor-popup .leaflet-popup-content-wrapper {
          padding: 0 !important;
          border-radius: 14px !important;
          overflow: hidden !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18) !important;
          border: 1px solid #e2e8f0 !important;
        }
        .tb-contractor-popup .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }
        .tb-contractor-popup .leaflet-popup-tip-container {
          display: none !important;
        }
        .leaflet-control-attribution {
          font-size: 9px !important;
        }
      `}</style>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
