import { SectionTitle } from "./SectionTitle";
import type { ContractorProfile } from "../types";

const C = {
  navy: "#0f1f3d",
  offWhite: "#f4f5f7",
  lightGray: "#e8ecf2",
  green: "#22c55e",
};

type Props = {
  about: ContractorProfile["about"];
  licenseNumber?: string;
  condensedFont: string;
};

export function AboutSection({ about, licenseNumber, condensedFont }: Props) {
  return (
    <div
      style={{
        padding: "22px 24px",
        borderBottom: `1px solid ${C.lightGray}`,
        background: "white",
        marginBottom: 8,
      }}
    >
      <SectionTitle condensedFont={condensedFont}>About</SectionTitle>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {about.map((item, i) => (
          <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#2d3748", fontWeight: 500 }}>
            <div
              style={{
                width: 30,
                height: 30,
                background: C.offWhite,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
            {item.text}
          </li>
        ))}
      </ul>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 14,
          padding: "10px 12px",
          background: C.offWhite,
          borderRadius: 8,
          fontSize: 13,
          color: C.navy,
          fontWeight: 500,
        }}
      >
        <span style={{ color: C.green, fontWeight: 700 }}>✓</span>
        TradeBase Verified Contractor
        {licenseNumber && <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.6 }}>License #{licenseNumber}</span>}
      </div>
    </div>
  );
}
