"use client";

import { useState } from "react";
import type { ContractorProfile } from "@/app/pro/[slug]/types";
import { SharedQuoteModal } from "./SharedQuoteModal";

const NAVY = "#0f1f3d";
const GOLD = "#f5a623";
const OFF_WHITE = "#f7f8fa";
const LIGHT_BORDER = "#e2e8f0";
const GRAY = "#64748b";

function StarRow({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < full ? GOLD : i === full && half ? GOLD : "#cbd5e1", fontSize: 14 }}>
          {i < full ? "★" : i === full && half ? "⯨" : "☆"}
        </span>
      ))}
      {count > 0 && (
        <span style={{ fontSize: 12, color: GRAY, marginLeft: 4 }}>
          {rating.toFixed(1)} ({count} review{count !== 1 ? "s" : ""})
        </span>
      )}
    </span>
  );
}

export function ClassicContractorTemplate({ profile }: { profile: ContractorProfile }) {
  const [modalOpen, setModalOpen] = useState(false);

  const firstName = profile.name.split(" ")[0] || profile.name;

  return (
    <div style={{ background: OFF_WHITE, color: "#1a2035", fontFamily: "system-ui, -apple-system, sans-serif", minHeight: "100vh", paddingBottom: 80 }}>

      {/* Header bar */}
      <div style={{ background: NAVY, padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Powered by TradeBase
        </span>
        {profile.phone && (
          <a href={profile.phone} style={{ color: GOLD, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            📞 {profile.phoneFormatted}
          </a>
        )}
      </div>

      {/* Hero */}
      <div style={{ background: NAVY, padding: "36px 24px 48px", textAlign: "center", position: "relative" }}>
        {profile.photoUrl && (
          <div style={{ marginBottom: 16 }}>
            <img
              src={profile.photoUrl}
              alt={profile.name}
              style={{ width: 90, height: 90, borderRadius: "50%", border: `4px solid ${GOLD}`, objectFit: "cover", margin: "0 auto" }}
            />
          </div>
        )}
        <div style={{ display: "inline-block", background: GOLD, color: NAVY, padding: "3px 12px", borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
          {profile.trade || "Contractor"}
        </div>
        <h1 style={{ color: "white", fontSize: 32, fontWeight: 800, margin: "8px 0 6px", lineHeight: 1.1 }}>
          {profile.name}
        </h1>
        {profile.tagline && (
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, lineHeight: 1.5, maxWidth: 480, margin: "0 auto 14px" }}>
            {profile.tagline}
          </p>
        )}
        {profile.location && (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 14 }}>📍 {profile.location}</p>
        )}
        {profile.reviewCount > 0 && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <StarRow rating={profile.rating} count={profile.reviewCount} />
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {profile.phone && (
            <a
              href={profile.phone}
              style={{ background: GOLD, color: NAVY, padding: "13px 24px", borderRadius: 8, fontWeight: 800, fontSize: 16, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              📞 Call Now
            </a>
          )}
          <button
            onClick={() => setModalOpen(true)}
            style={{ background: "transparent", color: "white", border: "2px solid rgba(255,255,255,0.4)", padding: "13px 24px", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: "pointer" }}
          >
            Request Free Quote
          </button>
        </div>
        {profile.urgencyLine && (
          <p style={{ color: GOLD, fontSize: 12, marginTop: 14, fontWeight: 600 }}>⚡ {profile.urgencyLine}</p>
        )}
      </div>

      {/* Stats strip */}
      {(profile.stats.jobsCompleted > 0 || profile.stats.yearsExperience > 0 || profile.stats.revenue) && (
        <div style={{ background: "white", borderBottom: `1px solid ${LIGHT_BORDER}`, display: "flex", justifyContent: "space-around", padding: "18px 0" }}>
          {profile.stats.jobsCompleted > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: NAVY }}>{profile.stats.jobsCompleted}+</div>
              <div style={{ fontSize: 11, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Jobs Done</div>
            </div>
          )}
          {profile.stats.yearsExperience > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: NAVY }}>{profile.stats.yearsExperience}</div>
              <div style={{ fontSize: 11, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Yrs Experience</div>
            </div>
          )}
          {profile.stats.revenue && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: NAVY }}>{profile.stats.revenue}</div>
              <div style={{ fontSize: 11, color: GRAY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Work Completed</div>
            </div>
          )}
        </div>
      )}

      {/* Trust badges */}
      <div style={{ background: "#eef2f7", borderBottom: `1px solid ${LIGHT_BORDER}`, padding: "14px 20px", display: "flex", gap: 16, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        {profile.trustItems.map((item) => (
          <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", fontSize: 12, fontWeight: 600, color: NAVY }}>
            <span>{item.icon}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px" }}>

        {/* Services */}
        {profile.services.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 14, paddingBottom: 8, borderBottom: `2px solid ${GOLD}`, display: "inline-block" }}>
              Services Offered
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {profile.services.map((s) => (
                <li key={s} style={{ display: "flex", alignItems: "center", gap: 8, background: "white", padding: "10px 14px", borderRadius: 8, border: `1px solid ${LIGHT_BORDER}`, fontSize: 14 }}>
                  <span style={{ color: "#16a34a", fontWeight: 900, fontSize: 12 }}>✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* About */}
        {profile.about.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 14, paddingBottom: 8, borderBottom: `2px solid ${GOLD}`, display: "inline-block" }}>
              About {firstName}
            </h2>
            <div style={{ background: "white", borderRadius: 10, border: `1px solid ${LIGHT_BORDER}`, padding: "16px 18px" }}>
              {profile.about.map((item) => (
                <div key={item.text} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                  <p style={{ fontSize: 14, lineHeight: 1.5, color: "#334155", margin: 0 }}>{item.text}</p>
                </div>
              ))}
              {profile.licenseNumber && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${LIGHT_BORDER}`, fontSize: 12, color: GRAY, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#16a34a" }}>🛡️</span>
                  {profile.licenseNumber}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Reviews */}
        {profile.reviews.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 14, paddingBottom: 8, borderBottom: `2px solid ${GOLD}`, display: "inline-block" }}>
              Customer Reviews
            </h2>
            <div style={{ display: "grid", gap: 12 }}>
              {profile.reviews.slice(0, 5).map((r, i) => (
                <div key={i} style={{ background: "white", borderRadius: 10, border: `1px solid ${LIGHT_BORDER}`, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>{r.name}</span>
                      {r.verified && (
                        <span style={{ marginLeft: 6, fontSize: 10, background: "#dcfce7", color: "#16a34a", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 1 }}>
                      {Array.from({ length: 5 }).map((_, s) => (
                        <span key={s} style={{ color: s < r.stars ? GOLD : "#cbd5e1", fontSize: 13 }}>★</span>
                      ))}
                    </div>
                  </div>
                  {r.jobType && <p style={{ fontSize: 11, color: GRAY, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{r.jobType}</p>}
                  <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.5, margin: 0 }}>&ldquo;{r.text}&rdquo;</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section style={{ marginTop: 36, background: NAVY, borderRadius: 12, padding: "28px 24px", textAlign: "center" }}>
          <h3 style={{ color: "white", fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
            Ready to get started?
          </h3>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, marginBottom: 20 }}>
            Call or request a free quote — {firstName} responds fast.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {profile.phone && (
              <a href={profile.phone} style={{ background: GOLD, color: NAVY, padding: "13px 24px", borderRadius: 8, fontWeight: 800, fontSize: 15, textDecoration: "none" }}>
                📞 {profile.phoneFormatted || "Call Now"}
              </a>
            )}
            <button
              onClick={() => setModalOpen(true)}
              style={{ background: "transparent", color: "white", border: "2px solid rgba(255,255,255,0.35)", padding: "13px 24px", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              Request Quote
            </button>
          </div>
        </section>

      </div>

      {/* Footer */}
      <div style={{ marginTop: 40, background: NAVY, padding: "16px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
          Powered by{" "}
          <a href="https://tradebase.contractors" style={{ color: GOLD, textDecoration: "none", fontWeight: 600 }}>TradeBase</a>
          {" "}· Are you a contractor?{" "}
          <a href="https://tradebase.contractors/waitlist" style={{ color: GOLD, textDecoration: "none" }}>Get more jobs →</a>
        </p>
      </div>

      {/* Sticky bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: NAVY, borderTop: `3px solid ${GOLD}`, padding: "12px 20px", display: "flex", gap: 10, zIndex: 50 }}>
        {profile.phone && (
          <a
            href={profile.phone}
            style={{ flex: 1, background: GOLD, color: NAVY, textAlign: "center", padding: "13px 0", fontWeight: 800, fontSize: 15, textDecoration: "none", borderRadius: 8 }}
          >
            📞 Call
          </a>
        )}
        <button
          onClick={() => setModalOpen(true)}
          style={{ flex: 2, background: "transparent", color: "white", border: "2px solid rgba(255,255,255,0.3)", padding: "13px 0", fontWeight: 700, fontSize: 15, cursor: "pointer", borderRadius: 8 }}
        >
          Request Free Quote
        </button>
      </div>

      <SharedQuoteModal
        contractorName={profile.name}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        accentColor={GOLD}
      />
    </div>
  );
}
