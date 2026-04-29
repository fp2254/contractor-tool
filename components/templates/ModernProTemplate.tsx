"use client";

import { useState } from "react";
import type { ContractorProfile } from "@/app/pro/[slug]/types";
import { SharedQuoteModal } from "./SharedQuoteModal";

const DARK = "#0d1117";
const DARK2 = "#161b22";
const DARK3 = "#21262d";
const BLUE = "#58a6ff";
const BLUE_DIM = "#1f6feb";
const WHITE = "#e6edf3";
const MUTED = "#8b949e";
const BORDER = "rgba(255,255,255,0.08)";
const GREEN = "#3fb950";

export function ModernProTemplate({ profile }: { profile: ContractorProfile }) {
  const [modalOpen, setModalOpen] = useState(false);
  const firstName = profile.name.split(" ")[0] || profile.name;

  return (
    <div style={{ background: DARK, color: WHITE, fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh", paddingBottom: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .mp-card { background: ${DARK2}; border: 1px solid ${BORDER}; border-radius: 10px; transition: border-color 0.2s; }
        .mp-card:hover { border-color: ${BLUE_DIM}; }
        .mp-btn-primary { transition: opacity 0.15s; }
        .mp-btn-primary:hover { opacity: 0.85; }
      `}</style>

      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: DARK2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN }} />
          <span style={{ fontSize: 12, color: MUTED }}>Profile active</span>
        </div>
        <span style={{ fontSize: 11, color: MUTED }}>
          Powered by{" "}
          <a href="https://tradebase.contractors" style={{ color: BLUE, textDecoration: "none" }}>TradeBase</a>
        </span>
      </div>

      {/* Hero */}
      <div style={{ padding: "48px 24px 40px", maxWidth: 680, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap" }}>
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt={profile.name}
              style={{ width: 80, height: 80, borderRadius: 10, border: `2px solid ${BORDER}`, objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: 10, background: DARK3, border: `2px solid ${BORDER}`, display: "grid", placeItems: "center", fontSize: 32, flexShrink: 0 }}>
              🔧
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
              {profile.trade && (
                <span style={{ background: `rgba(88,166,255,0.1)`, border: `1px solid rgba(88,166,255,0.25)`, color: BLUE, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  {profile.trade}
                </span>
              )}
              {profile.reviewCount > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: MUTED }}>
                  <span style={{ color: "#f5a623" }}>★</span>
                  {profile.rating.toFixed(1)} · {profile.reviewCount} review{profile.reviewCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.1, margin: "0 0 8px", color: WHITE }}>
              {profile.name}
            </h1>
            {profile.tagline && (
              <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.5, margin: 0 }}>{profile.tagline}</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        {(profile.stats.jobsCompleted > 0 || profile.stats.yearsExperience > 0 || profile.stats.revenue) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 28 }}>
            {profile.stats.jobsCompleted > 0 && (
              <div style={{ background: DARK2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: BLUE, lineHeight: 1 }}>{profile.stats.jobsCompleted}+</div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Jobs Done</div>
              </div>
            )}
            {profile.stats.yearsExperience > 0 && (
              <div style={{ background: DARK2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: BLUE, lineHeight: 1 }}>{profile.stats.yearsExperience}</div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Yrs Exp</div>
              </div>
            )}
            {profile.stats.revenue && (
              <div style={{ background: DARK2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: BLUE, lineHeight: 1 }}>{profile.stats.revenue}</div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Completed</div>
              </div>
            )}
            {profile.location && (
              <div style={{ background: DARK2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, lineHeight: 1.3 }}>{profile.location}</div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Service Area</div>
              </div>
            )}
          </div>
        )}

        {/* CTA buttons */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {profile.phone && (
            <a
              href={profile.phone}
              className="mp-btn-primary"
              style={{ background: BLUE_DIM, color: WHITE, padding: "12px 22px", borderRadius: 8, fontWeight: 700, fontSize: 15, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              📞 {profile.phoneFormatted || "Call Now"}
            </a>
          )}
          <button
            onClick={() => setModalOpen(true)}
            className="mp-btn-primary"
            style={{ background: "transparent", color: WHITE, border: `1px solid ${BORDER}`, padding: "12px 22px", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: "pointer" }}
          >
            Request Quote →
          </button>
        </div>

        {profile.urgencyLine && (
          <p style={{ marginTop: 12, color: GREEN, fontSize: 12, fontWeight: 600 }}>⚡ {profile.urgencyLine}</p>
        )}
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px" }}>

        {/* Services */}
        {profile.services.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}>
              Services
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {profile.services.map((s, i) => (
                <span
                  key={i}
                  className="mp-card"
                  style={{ padding: "6px 14px", fontSize: 13, color: WHITE, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <span style={{ color: BLUE, fontSize: 10 }}>▸</span>
                  {s.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Trust items */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}>
            Why Choose {firstName}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {profile.trustItems.map((item) => (
              <div key={item.text} className="mp-card" style={{ padding: "12px 14px", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: WHITE }}>{item.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* About */}
        {profile.about.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}>
              About
            </h2>
            <div className="mp-card" style={{ padding: "18px 18px" }}>
              {profile.about.map((item) => (
                <div key={item.text} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: WHITE, margin: 0, opacity: 0.85 }}>{item.text}</p>
                </div>
              ))}
              {profile.licenseNumber && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}`, fontSize: 12, color: MUTED, display: "flex", gap: 6 }}>
                  <span>🛡️</span>
                  <span>{profile.licenseNumber}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Reviews */}
        {profile.reviews.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}>
              Reviews
              {profile.reviewCount > 0 && (
                <span style={{ marginLeft: 8, color: "#f5a623", fontWeight: 700, textTransform: "none" }}>
                  ★ {profile.rating.toFixed(1)}
                </span>
              )}
            </h2>
            <div style={{ display: "grid", gap: 10 }}>
              {profile.reviews.slice(0, 6).map((r, i) => (
                <div key={i} className="mp-card" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</span>
                      {r.verified && (
                        <span style={{ fontSize: 10, color: GREEN, fontWeight: 600 }}>✓ Verified</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 1 }}>
                      {Array.from({ length: 5 }).map((_, s) => (
                        <span key={s} style={{ color: s < r.stars ? "#f5a623" : DARK3, fontSize: 11 }}>★</span>
                      ))}
                    </div>
                  </div>
                  {r.jobType && <p style={{ fontSize: 11, color: BLUE, marginBottom: 6, fontWeight: 600 }}>{r.jobType}</p>}
                  <p style={{ fontSize: 13, color: "rgba(230,237,243,0.8)", lineHeight: 1.55, margin: 0 }}>&ldquo;{r.text}&rdquo;</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA block */}
        <section style={{ background: `linear-gradient(135deg, ${DARK2} 0%, #1c2333 100%)`, border: `1px solid ${BLUE_DIM}`, borderRadius: 12, padding: "28px 24px", marginBottom: 24, textAlign: "center", boxShadow: `0 0 40px rgba(31,111,235,0.15)` }}>
          <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, color: WHITE }}>
            Ready to get started?
          </h3>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>
            {firstName} responds fast. Get a free estimate today.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {profile.phone && (
              <a href={profile.phone} className="mp-btn-primary" style={{ background: BLUE_DIM, color: WHITE, padding: "12px 24px", borderRadius: 8, fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
                📞 Call {firstName}
              </a>
            )}
            <button
              onClick={() => setModalOpen(true)}
              className="mp-btn-primary"
              style={{ background: "transparent", color: WHITE, border: `1px solid rgba(88,166,255,0.4)`, padding: "12px 24px", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              Free Quote →
            </button>
          </div>
        </section>

      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "16px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
          Are you a contractor?{" "}
          <a href="https://tradebase.contractors/waitlist" style={{ color: BLUE, textDecoration: "none" }}>Get more jobs with TradeBase →</a>
        </p>
      </div>

      {/* Sticky bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: DARK2, borderTop: `1px solid ${BORDER}`, padding: "12px 20px", display: "flex", gap: 10, zIndex: 50 }}>
        {profile.phone && (
          <a href={profile.phone} style={{ flex: 1, background: BLUE_DIM, color: WHITE, textAlign: "center", padding: "13px 0", fontWeight: 700, fontSize: 15, textDecoration: "none", borderRadius: 8 }}>
            📞 Call
          </a>
        )}
        <button
          onClick={() => setModalOpen(true)}
          style={{ flex: 2, background: "transparent", color: WHITE, border: `1px solid ${BORDER}`, padding: "13px 0", fontWeight: 700, fontSize: 15, cursor: "pointer", borderRadius: 8 }}
        >
          Get Free Quote
        </button>
      </div>

      <SharedQuoteModal
        contractorName={profile.name}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        accentColor={BLUE}
      />
    </div>
  );
}
