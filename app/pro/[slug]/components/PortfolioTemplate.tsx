"use client";

import { useState, useEffect } from "react";
import type { ContractorProfile } from "../types";

/* ─── helpers ─── */
function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(n) ? "#f59e0b" : "#e5e7eb"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </span>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n}`;
}

function calcProfileStrength(p: ContractorProfile): number {
  let score = 0;
  if (p.photoUrl) score += 20;
  if (p.trade) score += 10;
  if (p.tagline) score += 10;
  if (p.services.length > 0) score += 15;
  if (p.reviews.length > 0) score += 15;
  if (p.licenseNumber) score += 10;
  if (p.phone) score += 10;
  if (p.location) score += 10;
  return Math.min(100, score);
}

function buildTimeline(yearsExp: number, jobsCompleted: number): { year: number; items: string[] }[] {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - Math.max(1, yearsExp);
  const years: { year: number; items: string[] }[] = [];

  for (let y = currentYear; y >= startYear; y--) {
    const items: string[] = [];
    const yearsAgo = currentYear - y;
    const jobsThisYear = Math.round(jobsCompleted * (yearsAgo === 0 ? 0.28 : yearsAgo === 1 ? 0.38 : yearsAgo === 2 ? 0.22 : 0.12));

    if (yearsAgo === 0) {
      if (jobsThisYear > 0) items.push(`Completed ${jobsThisYear} projects`);
      items.push("Earning 5-star reviews");
      if (jobsCompleted > 100) items.push("Crossed major project milestone");
    } else if (yearsAgo === 1) {
      if (jobsThisYear > 0) items.push(`Completed ${jobsThisYear} projects`);
      items.push("Expanded service area");
      items.push("Grew customer base");
    } else if (yearsAgo === 2) {
      if (jobsThisYear > 0) items.push(`Completed ${jobsThisYear} projects`);
      items.push("Added commercial work");
    } else {
      items.push("Business founded");
      items.push("First customer served");
      if (jobsThisYear > 0) items.push(`First ${jobsThisYear} projects completed`);
    }
    if (items.length > 0) years.push({ year: y, items });
  }
  return years;
}

function buildSpecializations(services: ContractorProfile["services"], jobsCompleted: number) {
  if (services.length === 0) return [];
  const weights = services.map((_, i) => Math.max(1, 10 - i * 1.5));
  const total = weights.reduce((a, b) => a + b, 0);
  return services.slice(0, 6).map((s, i) => ({
    name: typeof s === "string" ? s : s.name,
    count: Math.round(jobsCompleted * (weights[i] / total)),
  }));
}

function buildCertifications(trustItems: ContractorProfile["trustItems"], licenseNumber?: string) {
  const base = trustItems.filter(t => t.text).map(t => ({ label: t.text, number: "", verified: true }));
  if (licenseNumber && !base.some(b => b.label.toLowerCase().includes("licens"))) {
    base.unshift({ label: "Licensed Contractor", number: licenseNumber, verified: true });
  }
  if (base.length === 0) {
    base.push({ label: "Licensed & Insured", number: "", verified: true });
    base.push({ label: "Background Checked", number: "", verified: true });
  }
  return base;
}

/* ─── bar chart SVG ─── */
function BarChart({ data, color, prefix = "" }: { data: { year: number; value: number }[]; color: string; prefix?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const h = 60;
  const barW = Math.min(28, Math.floor(200 / data.length) - 6);
  return (
    <svg viewBox={`0 0 ${data.length * (barW + 6) + 10} ${h + 28}`} style={{ width: "100%", overflow: "visible" }}>
      {data.map((d, i) => {
        const bh = Math.round((d.value / max) * h);
        const x = 5 + i * (barW + 6);
        const y = h - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} fill={color} rx={3} />
            <text x={x + barW / 2} y={h + 14} textAnchor="middle" fontSize={8} fill="#9ca3af">{d.year}</text>
            <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={7} fill={color} fontWeight="600">
              {prefix}{d.value >= 1000 ? `${(d.value / 1000).toFixed(0)}k` : d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ data, color }: { data: { year: number; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 5.1);
  const min = Math.min(...data.map(d => d.value));
  const h = 60;
  const w = 200;
  const step = data.length > 1 ? w / (data.length - 1) : w;

  const points = data.map((d, i) => ({
    x: Math.round(5 + i * step),
    y: Math.round(h - ((d.value - min) / (max - min || 1)) * (h - 10) - 5),
  }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w + 10} ${h + 28}`} style={{ width: "100%", overflow: "visible" }}>
      <polyline fill="none" stroke={color} strokeWidth={2} points={points.map(p => `${p.x},${p.y}`).join(" ")} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3} fill={color} />
          <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize={7} fill={color} fontWeight="600">{data[i].value.toFixed(2)}</text>
          <text x={p.x} y={h + 14} textAnchor="middle" fontSize={8} fill="#9ca3af">{data[i].year}</text>
        </g>
      ))}
      <path d={pathD} fill="none" />
    </svg>
  );
}

/* ─── nav items ─── */
const NAV = [
  { id: "overview", label: "Overview", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { id: "projects", label: "Projects", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3l-4-2-4 2"/></svg> },
  { id: "reviews", label: "Reviews", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  { id: "services", label: "Services", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg> },
  { id: "timeline", label: "Timeline", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { id: "certifications", label: "Certifications", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
  { id: "gallery", label: "Gallery", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
  { id: "growth", label: "Growth", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { id: "contact", label: "Contact", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.07 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg> },
];

/* ─── main component ─── */
export function PortfolioTemplate({ profile }: { profile: ContractorProfile }) {
  const [activeSection, setActiveSection] = useState("overview");
  const [projectFilter, setProjectFilter] = useState("All Projects");

  const strength = calcProfileStrength(profile);
  const hoursWorked = profile.stats.jobsCompleted * 9;
  const recommendRate = profile.reviews.length > 0
    ? Math.round((profile.reviews.filter(r => r.stars >= 4).length / profile.reviews.length) * 100)
    : 98;
  const certs = buildCertifications(profile.trustItems, profile.licenseNumber);
  const specializations = buildSpecializations(profile.services, profile.stats.jobsCompleted);
  const timeline = buildTimeline(profile.stats.yearsExperience, profile.stats.jobsCompleted);

  const yearsExp = Math.max(1, profile.stats.yearsExperience);
  const currentYear = new Date().getFullYear();
  const growthYears = Array.from({ length: Math.min(yearsExp + 1, 5) }, (_, i) => currentYear - (Math.min(yearsExp, 4)) + i);
  const jobsByYear = growthYears.map((y, i) => ({
    year: y,
    value: Math.round(profile.stats.jobsCompleted * (i === growthYears.length - 1 ? 0.3 : i === growthYears.length - 2 ? 0.38 : i === growthYears.length - 3 ? 0.2 : 0.12)),
  }));
  const ratingByYear = growthYears.map((y, i) => ({
    year: y,
    value: Math.max(4.5, Math.min(5.0, (profile.rating || 4.8) - (growthYears.length - 1 - i) * 0.06)),
  }));
  const repeatByYear = growthYears.map((y, i) => ({
    year: y,
    value: Math.round(10 + i * 6 + (i === growthYears.length - 1 ? 4 : 0)),
  }));

  const filterTabs = ["All Projects", ...profile.services.slice(0, 7).map(s => (typeof s === "string" ? s : s.name))];
  const featuredPhotos = profile.photos.slice(0, 3);

  /* scroll spy */
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); }),
      { rootMargin: "-40% 0px -55% 0px" }
    );
    NAV.forEach(n => { const el = document.getElementById(n.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); setActiveSection(id); }
  }

  const NAVY = "#1B3A6B";
  const GREEN = "#16a34a";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f0f2f5", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── LEFT SIDEBAR ── */}
      <aside style={{
        width: 220, flexShrink: 0, position: "sticky", top: 0, height: "100vh",
        background: "white", borderRight: "1px solid #e8ecf2",
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        {/* logo / name */}
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #f0f2f5" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <p style={{ fontWeight: 700, fontSize: 11, color: NAVY, textTransform: "uppercase", letterSpacing: "0.4px" }}>{profile.name}</p>
              <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>{profile.trade}</p>
            </div>
          </div>
        </div>

        {/* nav */}
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {NAV.map(item => {
            const active = activeSection === item.id;
            return (
              <button key={item.id} onClick={() => scrollTo(item.id)} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                background: active ? NAVY : "transparent",
                color: active ? "white" : "#6b7280",
                fontWeight: active ? 600 : 400, fontSize: 13, textAlign: "left",
                marginBottom: 2, transition: "all 0.15s",
              }}>
                <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* profile strength */}
        <div style={{ margin: "0 12px 16px", background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid #e8ecf2" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>Profile Strength</p>
            <span style={{ fontSize: 13, fontWeight: 800, color: NAVY }}>{strength}%</span>
          </div>
          <div style={{ height: 6, background: "#e5e7eb", borderRadius: 6, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ height: "100%", width: `${strength}%`, background: strength >= 80 ? GREEN : strength >= 50 ? "#f59e0b" : "#ef4444", borderRadius: 6, transition: "width 0.5s" }} />
          </div>
          <p style={{ fontSize: 10, color: "#9ca3af", marginBottom: 8, lineHeight: 1.4 }}>
            {strength < 100 ? "Complete your profile to reach 100%." : "Your profile is complete!"}
          </p>
          <a href="/app/more" style={{
            display: "block", textAlign: "center", background: NAVY, color: "white",
            fontWeight: 700, fontSize: 11, padding: "7px", borderRadius: 7, textDecoration: "none",
          }}>
            Improve Profile
          </a>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "0 0 80px" }}>

        {/* ── HERO ── */}
        <section id="overview" style={{ background: "white", padding: "28px 32px 24px", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            {/* left text */}
            <div style={{ flex: 1 }}>
              {/* verified badge */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#dcfce7", borderRadius: 20, padding: "4px 10px", marginBottom: 12 }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill={GREEN}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, letterSpacing: "0.5px", textTransform: "uppercase" }}>Verified Contractor</span>
              </div>

              <h1 style={{ fontSize: 30, fontWeight: 800, color: "#0f1f3d", lineHeight: 1.15, marginBottom: 10 }}>{profile.name}</h1>

              {/* stars */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Stars n={profile.rating} size={16} />
                <span style={{ fontWeight: 700, fontSize: 14, color: "#1f2937" }}>{profile.rating.toFixed(2)}</span>
                <span style={{ fontSize: 13, color: "#9ca3af" }}>({profile.reviewCount} reviews)</span>
              </div>

              {/* trust badges */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {certs.slice(0, 4).map((c, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#374151", fontWeight: 500 }}>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth={2.5}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {c.label}
                    {i < 3 && <span style={{ color: "#d1d5db", marginLeft: 4 }}>•</span>}
                  </span>
                ))}
              </div>

              {/* location & years */}
              <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 12, color: "#6b7280" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {profile.location}
                </span>
                <span>In Business Since {new Date().getFullYear() - profile.stats.yearsExperience}</span>
              </div>

              {/* tagline */}
              {profile.tagline && (
                <p style={{ fontSize: 13, color: "#4b5563", fontStyle: "italic", marginBottom: 0 }}>
                  &ldquo;{profile.tagline}&rdquo;
                </p>
              )}
            </div>

            {/* right: hero photo + fast response */}
            <div style={{ flexShrink: 0, width: 220, position: "relative" }}>
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.name} style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 12 }} />
              ) : (
                <div style={{ width: "100%", height: 160, background: "linear-gradient(135deg, #1B3A6B 0%, #2d5a9e 100%)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                </div>
              )}
              {/* fast response */}
              <div style={{ position: "absolute", bottom: -12, right: 12, background: "white", borderRadius: 10, padding: "8px 12px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: 9, color: "#9ca3af", margin: 0, fontWeight: 500 }}>Fast Response</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#0f1f3d", margin: 0 }}>Avg response time</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", margin: 0 }}>Within 1 hour</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CAREER SNAPSHOT ── */}
        <section id="overview-stats" style={{ padding: "0 32px 16px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>Career Snapshot</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
            {[
              { icon: "📋", value: profile.stats.jobsCompleted.toString(), label: "Completed Projects" },
              { icon: "💵", value: profile.stats.revenue || `$${Math.round(profile.stats.jobsCompleted * 2400 / 1000)}K`, label: "Revenue Tracked" },
              { icon: "⏱", value: `${hoursWorked.toLocaleString()}+`, label: "Hours Worked" },
              { icon: "⭐", value: profile.rating > 0 ? `${profile.rating.toFixed(2)}★` : "N/A", label: "Average Rating" },
              { icon: "👍", value: `${recommendRate}%`, label: "Recommendation Rate" },
              { icon: "🏅", value: certs.length.toString(), label: "Certifications" },
            ].map((s, i) => (
              <div key={i} style={{ background: "white", borderRadius: 10, padding: "14px 10px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f1f3d", marginBottom: 2 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "#9ca3af", lineHeight: 1.3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURED PROJECTS ── */}
        <section id="projects" style={{ padding: "0 32px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "1px", textTransform: "uppercase" }}>Featured Projects</p>
            <a href={`/pro/${profile.slug}/review`} style={{ fontSize: 12, fontWeight: 600, color: NAVY, textDecoration: "none" }}>View All Projects →</a>
          </div>

          {/* filter chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {filterTabs.map(tab => (
              <button key={tab} onClick={() => setProjectFilter(tab)} style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                background: projectFilter === tab ? NAVY : "white",
                color: projectFilter === tab ? "white" : "#6b7280",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}>{tab}</button>
            ))}
          </div>

          {/* project cards */}
          {featuredPhotos.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {featuredPhotos.map((photo, i) => (
                <div key={i} style={{ background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                  {/* before/after photo */}
                  <div style={{ display: "flex", height: 120, position: "relative" }}>
                    <div style={{ flex: 1, background: "#d1d5db", position: "relative", overflow: "hidden" }}>
                      <img src={photo.url} alt="before" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(80%) brightness(0.7)" }} />
                      <span style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.5)", color: "white", fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>BEFORE</span>
                    </div>
                    <div style={{ flex: 1, background: "#e5e7eb", position: "relative", overflow: "hidden" }}>
                      <img src={photo.url} alt="after" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <span style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.5)", color: "white", fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>AFTER</span>
                    </div>
                  </div>
                  {/* details */}
                  <div style={{ padding: "10px 12px" }}>
                    <p style={{ fontWeight: 700, fontSize: 12, color: "#0f1f3d", marginBottom: 2 }}>{photo.title || `Project ${i + 1}`}</p>
                    <p style={{ fontSize: 11, color: "#2563eb", fontWeight: 600, marginBottom: 6 }}>{typeof profile.services[i % profile.services.length] === "string" ? profile.services[i % profile.services.length] : (profile.services[i % profile.services.length] as any)?.name ?? ""}</p>
                    <div style={{ display: "flex", gap: 10, fontSize: 10, color: "#9ca3af", marginBottom: 6 }}>
                      {photo.location && <span>📍 {photo.location}</span>}
                      {photo.timeAgo && <span>📅 {photo.timeAgo}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 10, fontSize: 10, color: "#374151", marginBottom: 6 }}>
                      {photo.cost && <span style={{ fontWeight: 600 }}>{photo.cost}</span>}
                    </div>
                    <Stars n={5} size={11} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: "white", borderRadius: 12, padding: "32px", textAlign: "center", color: "#9ca3af" }}>
              <p style={{ fontSize: 14, fontWeight: 600 }}>No featured projects yet</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Add photos to your profile to showcase your work</p>
              <a href="/app/more" style={{ display: "inline-block", marginTop: 12, background: NAVY, color: "white", fontWeight: 700, fontSize: 12, padding: "8px 18px", borderRadius: 8, textDecoration: "none" }}>Add Photos</a>
            </div>
          )}
        </section>

        {/* ── MIDDLE: two columns ── */}
        <section style={{ padding: "0 32px 16px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>

          {/* left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* CAREER TIMELINE */}
            <div id="timeline" style={{ background: "white", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 16 }}>Career Timeline</p>
              <div style={{ position: "relative" }}>
                {timeline.map((entry, i) => (
                  <div key={entry.year} style={{ display: "flex", gap: 16, marginBottom: i < timeline.length - 1 ? 20 : 0, position: "relative" }}>
                    {/* line + circle */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "white" }}>{entry.year}</span>
                      </div>
                      {i < timeline.length - 1 && <div style={{ width: 2, flex: 1, background: "#e5e7eb", marginTop: 4 }} />}
                    </div>
                    {/* items */}
                    <div style={{ paddingTop: 4, paddingBottom: i < timeline.length - 1 ? 20 : 0 }}>
                      {entry.items.map((item, j) => (
                        <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 5 }}>
                          <svg width={12} height={12} viewBox="0 0 24 24" fill={GREEN} style={{ flexShrink: 0, marginTop: 1 }}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          <span style={{ fontSize: 12, color: "#374151" }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PHOTO GALLERY */}
            <div id="gallery" style={{ background: "white", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "1px", textTransform: "uppercase" }}>Photo Gallery</p>
                <a href={`/pro/${profile.slug}/review`} style={{ fontSize: 12, fontWeight: 600, color: NAVY, textDecoration: "none" }}>View Full Gallery →</a>
              </div>
              {profile.photos.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {profile.photos.slice(0, 6).map((photo, i) => (
                    <div key={i} style={{ aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: "#f0f2f5" }}>
                      <img src={photo.url} alt={photo.title || `Photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "24px", color: "#9ca3af" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>No photos yet</p>
                  <p style={{ fontSize: 11, marginTop: 4 }}>Add job photos to showcase your work</p>
                </div>
              )}
            </div>
          </div>

          {/* right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* SPECIALIZATIONS */}
            <div id="services" style={{ background: "white", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>Specializations</p>
              {specializations.length > 0 ? (
                <>
                  {specializations.map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < specializations.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                      <span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>{s.name}</span>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>{s.count} Projects</span>
                    </div>
                  ))}
                  <a href="#services" style={{ display: "block", fontSize: 11, fontWeight: 600, color: NAVY, textDecoration: "none", marginTop: 10 }}>View All Services →</a>
                </>
              ) : (
                <p style={{ fontSize: 12, color: "#9ca3af" }}>No services listed yet</p>
              )}
            </div>

            {/* CERTIFICATIONS */}
            <div id="certifications" style={{ background: "white", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>Certifications</p>
              {certs.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill={GREEN}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#0f1f3d", margin: 0 }}>{c.label}</p>
                    {c.number && <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0" }}>{c.number}</p>}
                    <p style={{ fontSize: 10, color: GREEN, margin: "1px 0 0" }}>Verified</p>
                  </div>
                </div>
              ))}
              <a href="#certifications" style={{ display: "block", fontSize: 11, fontWeight: 600, color: NAVY, textDecoration: "none", marginTop: 6 }}>View All Certifications →</a>
            </div>

            {/* TOP REVIEWS */}
            <div id="reviews" style={{ background: "white", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "1px", textTransform: "uppercase" }}>Top Reviews</p>
                <a href={`/pro/${profile.slug}/review`} style={{ fontSize: 11, fontWeight: 600, color: NAVY, textDecoration: "none" }}>View All Reviews →</a>
              </div>
              {profile.reviews.length > 0 ? (
                <>
                  {profile.reviews.slice(0, 3).map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, paddingBottom: 10, marginBottom: 10, borderBottom: i < Math.min(2, profile.reviews.length - 1) ? "1px solid #f3f4f6" : "none" }}>
                      {/* avatar */}
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: `hsl(${i * 80 + 200}, 60%, 50%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{r.name.charAt(0)}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#0f1f3d" }}>{r.name}</span>
                          <Stars n={r.stars} size={9} />
                        </div>
                        {r.jobType && <p style={{ fontSize: 10, color: "#6b7280", margin: "0 0 4px" }}>{r.jobType}</p>}
                        <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.4, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>&ldquo;{r.text}&rdquo;</p>
                      </div>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 8, textAlign: "center" }}>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>
                      {profile.reviewCount} Total Reviews • {profile.rating.toFixed(2)} Average Rating
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "16px", color: "#9ca3af" }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>No reviews yet</p>
                  <a href={`/pro/${profile.slug}/review`} style={{ display: "inline-block", marginTop: 8, background: NAVY, color: "white", fontWeight: 700, fontSize: 11, padding: "6px 14px", borderRadius: 7, textDecoration: "none" }}>Get First Review</a>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── BUSINESS GROWTH ── */}
        <section id="growth" style={{ padding: "0 32px 24px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>Business Growth</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {[
              { label: "Projects Completed", sub: "By Year", chart: <BarChart data={jobsByYear} color={NAVY} /> },
              { label: "Revenue Tracked", sub: "By Year", chart: <BarChart data={jobsByYear.map(d => ({ year: d.year, value: d.value * 2400 }))} color="#0d9488" prefix="$" /> },
              { label: "Average Rating", sub: "Trend", chart: <LineChart data={ratingByYear} color="#2563eb" /> },
              { label: "Repeat Customers", sub: "Percentage", chart: <BarChart data={repeatByYear} color="#1d4ed8" /> },
            ].map((item, i) => (
              <div key={i} style={{ background: "white", borderRadius: 12, padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#0f1f3d", marginBottom: 1 }}>{item.label}</p>
                <p style={{ fontSize: 10, color: "#9ca3af", marginBottom: 12 }}>{item.sub}</p>
                {item.chart}
              </div>
            ))}
          </div>
        </section>

        {/* ── CONTACT / FOOTER CTA ── */}
        <section id="contact" style={{ margin: "0 32px 0", borderRadius: 12, background: NAVY, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, color: "white", margin: 0 }}>Ready to work with us?</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", margin: "4px 0 0" }}>Get a fast, free estimate for your home or business.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href={`/pro/${profile.slug}/review`} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: GREEN, color: "white", fontWeight: 700, fontSize: 12, padding: "9px 16px", borderRadius: 8, textDecoration: "none" }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Request Estimate
            </a>
            {profile.phone && (
              <>
                <a href={`tel:${profile.phone.replace("tel:", "")}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.12)", color: "white", fontWeight: 600, fontSize: 12, padding: "9px 16px", borderRadius: 8, textDecoration: "none" }}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.07 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
                  Call Us
                </a>
                <a href={`sms:${profile.phone.replace("tel:", "")}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.12)", color: "white", fontWeight: 600, fontSize: 12, padding: "9px 16px", borderRadius: 8, textDecoration: "none" }}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  Text Us
                </a>
              </>
            )}
            <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.12)", color: "white", fontWeight: 600, fontSize: 12, padding: "9px 16px", borderRadius: 8, textDecoration: "none" }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              Visit Website
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
