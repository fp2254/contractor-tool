"use client";

import { SectionTitle } from "./SectionTitle";
import type { ServiceEntry } from "../types";

const C = {
  navy: "#0f1f3d",
  offWhite: "#f4f5f7",
  lightGray: "#e8ecf2",
  gray: "#8a9ab5",
};

type Props = {
  services: ServiceEntry[];
  condensedFont: string;
};

export function ServicesSection({ services, condensedFont }: Props) {
  const withPhoto = services.filter((s) => s.photo_url);
  const withoutPhoto = services.filter((s) => !s.photo_url);

  return (
    <div
      style={{
        padding: "22px 24px",
        borderBottom: `1px solid ${C.lightGray}`,
        background: "white",
        marginBottom: 8,
      }}
    >
      <SectionTitle condensedFont={condensedFont}>Services</SectionTitle>

      {/* Photo cards for services that have an example photo */}
      {withPhoto.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 10,
            marginBottom: withoutPhoto.length > 0 ? 12 : 0,
          }}
        >
          {withPhoto.map((svc, i) => (
            <div
              key={i}
              style={{
                borderRadius: 10,
                overflow: "hidden",
                border: `1px solid ${C.lightGray}`,
                background: C.offWhite,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "4/3",
                  background: "#d0d8e4",
                }}
              >
                <img
                  src={svc.photo_url}
                  alt={svc.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
              <div
                className={condensedFont}
                style={{
                  padding: "7px 10px",
                  fontWeight: 700,
                  fontSize: 13,
                  color: C.navy,
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}
              >
                {svc.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plain pill chips for services without a photo */}
      {withoutPhoto.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {withoutPhoto.map((svc, i) => (
            <span
              key={i}
              style={{
                background: C.offWhite,
                border: `1px solid ${C.lightGray}`,
                color: C.navy,
                fontSize: 13,
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: 20,
              }}
            >
              {svc.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
