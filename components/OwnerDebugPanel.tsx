"use client";

import { useState } from "react";
import type { ContractorProfile } from "@/app/pro/[slug]/types";

type Check = { label: string; ok: boolean; fix?: string };

function buildChecks(p: ContractorProfile): Check[] {
  return [
    { label: "Trade / specialty",    ok: !!p.trade,           fix: "Add your trade in the editor" },
    { label: "Tagline",              ok: !!p.tagline,         fix: "Write a one-liner tagline" },
    { label: "Phone number",         ok: !!p.phoneFormatted && p.phoneFormatted !== "—", fix: "Add your phone number" },
    { label: "Service area",         ok: !!p.serviceArea,     fix: "Set your service area" },
    { label: "Profile photo",        ok: !!p.photoUrl,        fix: "Upload a profile photo" },
    { label: "About / bio",          ok: p.about.length > 0,  fix: "Add your bio in the About section" },
    { label: "At least 1 service",   ok: p.services.length > 0, fix: "Add your services" },
    { label: "Trust highlights",     ok: p.trustItems.length > 0, fix: "Add trust bullet points" },
    { label: "Project photos",       ok: p.photos.length > 0, fix: "Upload project photos" },
    { label: "Years in business",    ok: p.stats.yearsExperience > 0, fix: "Set years in business" },
    { label: "Template selected",    ok: !!p.selectedTemplate, fix: "Pick a template in the editor" },
  ];
}

const TEMPLATE_LABELS: Record<string, string> = {
  classic: "Classic",
  modern:  "Modern Pro",
  trust:   "Trust Builder",
  "":      "Default",
};

export function OwnerDebugPanel({ profile }: { profile: ContractorProfile }) {
  const [open, setOpen] = useState(false);

  const checks = buildChecks(profile);
  const issues = checks.filter((c) => !c.ok);
  const score  = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);

  const scoreColor =
    score >= 85 ? "#22c55e" :
    score >= 60 ? "#f59e0b" :
    "#ef4444";

  return (
    <>
      {/* Collapsed toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 16,
            zIndex: 9000,
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: 12,
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 7,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          <span style={{ fontSize: 16 }}>🔧</span>
          {issues.length > 0 && (
            <span style={{
              background: "#ef4444",
              color: "white",
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 99,
              padding: "1px 6px",
              fontFamily: "monospace",
            }}>
              {issues.length} issue{issues.length !== 1 ? "s" : ""}
            </span>
          )}
          {issues.length === 0 && (
            <span style={{
              background: "#22c55e",
              color: "white",
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 99,
              padding: "1px 6px",
              fontFamily: "monospace",
            }}>
              ✓ Good
            </span>
          )}
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9000,
          background: "#0f172a",
          borderTop: "1px solid #1e293b",
          maxHeight: "70vh",
          overflowY: "auto",
          fontFamily: "ui-monospace, monospace",
          fontSize: 12,
          color: "#cbd5e1",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
        }}>
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid #1e293b",
            position: "sticky",
            top: 0,
            background: "#0f172a",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>🔧</span>
              <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 13 }}>Owner Panel</span>
              <span style={{ color: "#64748b", fontSize: 11 }}>· /pro/{profile.slug}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <a
                href="/app/profile/public-profile"
                style={{
                  background: "#1e40af",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 6,
                  textDecoration: "none",
                }}
              >
                Edit Profile →
              </a>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "#1e293b",
                  border: "none",
                  color: "#94a3b8",
                  borderRadius: 6,
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Score + template row */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Tile label="Profile Score">
                <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor }}>{score}%</span>
              </Tile>
              <Tile label="Template">
                <span style={{ color: "#f1f5f9", fontWeight: 600 }}>
                  {TEMPLATE_LABELS[profile.selectedTemplate ?? ""] ?? profile.selectedTemplate ?? "Default"}
                </span>
              </Tile>
              <Tile label="Published">
                <span style={{ color: profile.isPublished ? "#22c55e" : "#f59e0b", fontWeight: 600 }}>
                  {profile.isPublished ? "✓ Live" : "◎ Draft"}
                </span>
              </Tile>
              <Tile label="Data">
                <span style={{ color: "#94a3b8" }}>
                  {profile.photos.length} photos · {profile.services.length} services · {profile.reviewCount} reviews
                </span>
              </Tile>
            </div>

            {/* Health checks */}
            <div>
              <p style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Profile Health
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
                {checks.map((c) => (
                  <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0" }}>
                    <span style={{ fontSize: 11, flexShrink: 0 }}>{c.ok ? "✅" : "❌"}</span>
                    <span style={{ color: c.ok ? "#94a3b8" : "#fca5a5", flex: 1 }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Issues list */}
            {issues.length > 0 && (
              <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 12px" }}>
                <p style={{ color: "#ef4444", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  What to fix
                </p>
                {issues.map((c) => (
                  <div key={c.label} style={{ display: "flex", gap: 6, marginBottom: 3 }}>
                    <span style={{ color: "#ef4444", flexShrink: 0 }}>→</span>
                    <span style={{ color: "#fca5a5" }}>{c.fix ?? c.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Sections config */}
            <div>
              <p style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Sections
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {[
                  ["services",       "Services"],
                  ["about",          "About"],
                  ["stats",          "Stats"],
                  ["certifications", "Certifications"],
                  ["reviews",        "Reviews"],
                  ["gallery",        "Gallery"],
                  ["serviceAreas",   "Service Areas"],
                  ["trustBar",       "Trust Bar"],
                ].map(([key, label]) => {
                  const enabled = (profile.sectionsConfig as any)[key] !== false;
                  return (
                    <span key={key} style={{
                      background: enabled ? "#14532d" : "#1e293b",
                      color: enabled ? "#86efac" : "#475569",
                      borderRadius: 4,
                      padding: "2px 7px",
                      fontSize: 11,
                    }}>
                      {enabled ? "✓" : "–"} {label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Raw slug / template debug */}
            <div style={{ background: "#020617", borderRadius: 8, padding: "8px 12px", color: "#475569" }}>
              <span style={{ color: "#22d3ee" }}>slug</span>={JSON.stringify(profile.slug)}{" "}
              <span style={{ color: "#22d3ee" }}>template</span>={JSON.stringify(profile.selectedTemplate ?? "")}{" "}
              <span style={{ color: "#22d3ee" }}>jobs</span>={profile.stats.jobsCompleted}{" "}
              <span style={{ color: "#22d3ee" }}>rating</span>={profile.rating}
            </div>

          </div>
        </div>
      )}
    </>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#1e293b",
      borderRadius: 8,
      padding: "8px 12px",
      flex: "1 1 120px",
      minWidth: 100,
    }}>
      <p style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 3 }}>
        {label}
      </p>
      {children}
    </div>
  );
}
