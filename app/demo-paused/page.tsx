import Link from "next/link";

export default function DemoPausedPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1B3A6B",
        padding: "40px 24px",
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 24,
          padding: "40px 32px",
          maxWidth: 360,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔧</div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#0f1f3d",
            marginBottom: 10,
            lineHeight: 1.2,
          }}
        >
          Demo Temporarily Paused
        </h1>

        <p
          style={{
            fontSize: 15,
            color: "#64748b",
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          We&apos;re making improvements to the TradeBase demo.
          It will be back shortly — join the waitlist to be notified.
        </p>

        <a
          href="https://tradebase.contractors/waitlist"
          style={{
            display: "block",
            backgroundColor: "#1B3A6B",
            color: "white",
            fontWeight: 700,
            fontSize: 15,
            padding: "14px 24px",
            borderRadius: 12,
            textDecoration: "none",
            marginBottom: 12,
          }}
        >
          Join the Waitlist →
        </a>

        <Link
          href="/auth/login"
          style={{
            display: "block",
            fontSize: 13,
            color: "#94a3b8",
            textDecoration: "none",
            paddingTop: 4,
          }}
        >
          Already have an account? Log in
        </Link>
      </div>
    </div>
  );
}
