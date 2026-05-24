"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { Contractor } from "./mockData";

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
    html: `
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
          font-weight: 800;
          font-size: 12px;
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2.5px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        ">
          <span style="transform: rotate(45deg);">${c.name.charAt(0)}</span>
        </div>
      </div>`,
    className: "",
    iconSize: [36, 42],
    iconAnchor: [18, 42],
  });
}

export default function LeafletMap({ contractors, hoveredId, selectedId, onSelect, onHover }: Props) {
  return (
    <MapContainer
      center={[39.5, -98.35]}
      zoom={4}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      zoomControl
      attributionControl
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={18}
      />
      {contractors.map((c) => {
        const active = hoveredId === c.id;
        const selected = selectedId === c.id;
        return (
          <Marker
            key={c.id}
            position={[c.lat, c.lng]}
            icon={makeIcon(c, active, selected)}
            eventHandlers={{
              click: () => onSelect(selected ? null : c.id),
              mouseover: () => onHover(c.id),
              mouseout: () => onHover(null),
            }}
          >
            {selected && (
              <Popup>
                <div style={{ minWidth: 200, fontFamily: "sans-serif", padding: 4 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, margin: "0 0 2px" }}>{c.name}</p>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 6px" }}>{c.trade} · {c.city}</p>
                  <p style={{ fontSize: 12, margin: "0 0 8px" }}>⭐ {c.rating_tb} ({c.reviews_tb} reviews)</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <a href={`/pro/${c.slug}`} style={{ flex: 1, border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "6px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#475569", textDecoration: "none", display: "block" }}>View Profile</a>
                    <a href="/find-contractors" style={{ flex: 1, background: "#1B3A6B", borderRadius: 8, padding: "6px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "white", textDecoration: "none", display: "block" }}>Get Quote</a>
                  </div>
                </div>
              </Popup>
            )}
          </Marker>
        );
      })}
    </MapContainer>
  );
}
