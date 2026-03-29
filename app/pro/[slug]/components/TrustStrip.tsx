import type { ContractorProfile } from "../types";

const C = {
  navy: "#0f1f3d",
  offWhite: "#f4f5f7",
  lightGray: "#e8ecf2",
};

type Props = {
  items: ContractorProfile["trustItems"];
};

export function TrustStrip({ items }: Props) {
  return (
    <div
      style={{
        background: "white",
        borderBottom: `1px solid ${C.lightGray}`,
        padding: "16px 20px",
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 12,
        marginBottom: 8,
      }}
    >
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: C.offWhite,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              flexShrink: 0,
            }}
          >
            {item.icon}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.navy, lineHeight: 1.3 }}>
            {item.text}
          </span>
        </div>
      ))}
    </div>
  );
}
