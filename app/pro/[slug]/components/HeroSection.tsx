"use client";

import Link from "next/link";
import type { ContractorProfile } from "../types";

const C = {
  navy: "#0f1f3d",
  gold: "#f5a623",
  green: "#22c55e",
  blue: "#1e4a8c",
};

function Stars({ count, size = 13 }: { count: number; size?: number }) {
  return (
    <span style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: C.gold, fontSize: size }}>★</span>
      ))}
    </span>
  );
}

type Props = {
  profile: ContractorProfile;
  condensedFont: string;
  onQuoteClick: () => void;
};

export function HeroSection({ profile, condensedFont, onQuoteClick }: Props) {
  return (
    <div style={{ backgroundColor: C.navy, position: "relative", overflow: "hidden" }}>
      {/* Gradient overlays */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 80% 50%, rgba(30,74,140,0.6) 0%, transparent 60%),
                       radial-gradient(ellipse at 20% 80%, rgba(245,166,35,0.15) 0%, transparent 50%)`,
        }}
      />
      {/* Diagonal texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.015) 40px, rgba(255,255,255,0.015) 41px)",
        }}
      />

      {/* Topbar */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Link
          href="https://tradebase.contractors"
          style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              backgroundColor: C.gold,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
            }}
          >
            🏠
          </div>
          <span
            className={condensedFont}
            style={{ fontWeight: 700, fontSize: 17, color: "white", letterSpacing: "0.5px" }}
          >
            TradeBase
          </span>
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.3)",
            color: C.green,
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 20,
          }}
        >
          ✓ Verified Contractor
        </div>
      </div>

      {/* Hero content */}
      <div style={{ position: "relative", zIndex: 10, padding: "28px 24px 36px" }}>

        {/* Avatar photo or initial */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              overflow: "hidden",
              border: "3px solid rgba(245,166,35,0.6)",
              flexShrink: 0,
              backgroundColor: "rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: 28, fontWeight: 800, color: "rgba(255,255,255,0.6)" }}>
                {profile.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className={condensedFont}
              style={{
                fontWeight: 900,
                fontSize: 36,
                color: "white",
                lineHeight: 1,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 4,
              }}
            >
              {profile.name}
            </div>
            <div
              className={condensedFont}
              style={{
                fontWeight: 600,
                fontSize: 17,
                color: C.gold,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              {profile.trade}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", marginBottom: 18, lineHeight: 1.4 }}>
          {profile.tagline}
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
            📍 <span>{profile.location}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Stars count={5} />
            <span style={{ color: "white", fontWeight: 600, fontSize: 13, marginLeft: 3 }}>{profile.rating}</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>({profile.reviewCount} reviews)</span>
          </div>
        </div>

        {/* CTA group */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={onQuoteClick}
            className={condensedFont}
            style={{
              display: "block",
              width: "100%",
              background: C.gold,
              color: C.navy,
              fontWeight: 800,
              fontSize: 19,
              letterSpacing: 1,
              textTransform: "uppercase",
              padding: 17,
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Get My Free Quote
          </button>

          <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.5)", letterSpacing: "0.2px" }}>
            {profile.urgencyLine}
          </div>

          <a
            href={`tel:${profile.phone}`}
            className={condensedFont}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              background: "transparent",
              color: "white",
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              padding: 15,
              border: "2px solid rgba(255,255,255,0.35)",
              borderRadius: 10,
              cursor: "pointer",
              textDecoration: "none",
              lineHeight: 1,
            }}
          >
            <span>📞</span>
            <span>
              Call Now:{" "}
              <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "0.5px" }}>
                {profile.phoneFormatted}
              </span>
            </span>
          </a>
        </div>

        {/* Trust microcopy */}
        <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 10, letterSpacing: "0.1px" }}>
          Free estimates &nbsp;·&nbsp; No obligation &nbsp;·&nbsp; Fast response
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
          {["No account needed", "Responds within hours", "Takes 30 seconds"].map((item) => (
            <span key={item} style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
              <span style={{ color: C.green }}>✓</span>&nbsp;{item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
