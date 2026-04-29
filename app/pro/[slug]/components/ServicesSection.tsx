import { SectionTitle } from "./SectionTitle";
import type { ServiceEntry } from "../types";

const C = {
  navy: "#0f1f3d",
  offWhite: "#f4f5f7",
  lightGray: "#e8ecf2",
};

type Props = {
  services: Array<string | ServiceEntry>;
  condensedFont: string;
};

export function ServicesSection({ services, condensedFont }: Props) {
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
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {services.map((service, i) => {
          const label = typeof service === "string" ? service : service.name;
          return (
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
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
