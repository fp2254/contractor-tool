"use client";

export function PreviewBanner({ templateName }: { templateName: string }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#1B3A6B",
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
        padding: "9px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "system-ui, sans-serif",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      }}
    >
      <span>👁 Template Preview — {templateName} — sample data only</span>
      <button
        onClick={() => window.close()}
        style={{
          background: "rgba(255,255,255,0.18)",
          border: "1px solid rgba(255,255,255,0.3)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          padding: "4px 14px",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        ✕ Close
      </button>
    </div>
  );
}
