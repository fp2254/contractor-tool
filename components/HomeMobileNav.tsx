"use client";

import { useState } from "react";
import Link from "next/link";

const BK = "#0a0a0a";
const OR = "#ff5b1f";
const YE = "#ffd400";
const BN = "#f4f1ea";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Earn", href: "#earn" },
  { label: "Find Contractors", href: "#find-contractors" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function HomeMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="md:hidden flex-shrink-0"
        aria-label="Toggle menu"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "6px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 5,
          marginLeft: 8,
        }}
      >
        <span style={{
          display: "block", width: 22, height: 2, background: BN,
          transition: "all 0.2s",
          transform: open ? "translateY(7px) rotate(45deg)" : "none",
        }} />
        <span style={{
          display: "block", width: 22, height: 2, background: BN,
          transition: "all 0.2s",
          opacity: open ? 0 : 1,
        }} />
        <span style={{
          display: "block", width: 22, height: 2, background: BN,
          transition: "all 0.2s",
          transform: open ? "translateY(-7px) rotate(-45deg)" : "none",
        }} />
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            top: 94,
            left: 0,
            right: 0,
            background: BK,
            borderBottom: `3px solid ${OR}`,
            zIndex: 99,
            padding: "8px 0 16px",
          }}
          className="md:hidden"
        >
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                padding: "14px 24px",
                color: "rgba(244,241,234,0.85)",
                textDecoration: "none",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {label}
            </a>
          ))}
          <div style={{ padding: "16px 24px 0" }}>
            <Link
              href="/waitlist"
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                textAlign: "center",
                background: OR,
                color: BK,
                padding: "14px 20px",
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontSize: 15,
                textDecoration: "none",
                boxShadow: `4px 4px 0 ${YE}`,
              }}
            >
              Claim Founder Spot — $20/mo →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
