"use client";

const C = {
  navy: "#0f1f3d",
  gold: "#f5a623",
};

type Props = {
  phone: string;
  phoneFormatted: string;
  condensedFont: string;
  onQuoteClick: () => void;
};

export function StickyBar({ phone, phoneFormatted, condensedFont, onQuoteClick }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: C.navy,
        borderTop: "1px solid rgba(255,255,255,0.12)",
        padding: "12px 16px",
        display: "flex",
        gap: 10,
        boxShadow: "0 -4px 20px rgba(0,0,0,0.3)",
      }}
    >
      <a
        href={`tel:${phone}`}
        className={condensedFont}
        style={{
          flex: 1,
          background: "transparent",
          color: "white",
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          padding: "13px 8px",
          border: "2px solid rgba(255,255,255,0.3)",
          borderRadius: 10,
          textAlign: "center",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          lineHeight: 1,
        }}
      >
        📞 Call Now
      </a>

      <button
        onClick={onQuoteClick}
        className={condensedFont}
        style={{
          flex: 2,
          background: C.gold,
          color: C.navy,
          fontWeight: 800,
          fontSize: 17,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          padding: "14px 10px",
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
        }}
      >
        Get My Free Quote
      </button>
    </div>
  );
}
