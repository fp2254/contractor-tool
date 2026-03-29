const C = {
  navyMid: "#1a2f52",
};

export function BottomCloser() {
  return (
    <div
      style={{
        backgroundColor: C.navyMid,
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 8,
      }}
    >
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>
        <strong style={{ color: "white", display: "block", fontSize: 14 }}>
          Ready to get started?
        </strong>
        Use the bar below to call or request a free quote.
      </div>
    </div>
  );
}
