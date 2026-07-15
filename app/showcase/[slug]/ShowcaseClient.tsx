"use client";

import { useState, useEffect } from "react";

/* ── types ── */
type Photo = { url: string; caption: string };
type Project = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  location: string | null;
  completed_at: string | null;
  photos: Photo[];
  tags: string[];
  cost: number | null;
};
type Review = { name: string; rating: number; text: string; jobType: string; location: string; date: string };
type GalleryPhoto = { url: string; title?: string };

type Props = {
  profile: {
    name: string;
    slug: string;
    trade: string;
    location: string;
    photo_url: string | null;
    tagline: string;
    years_experience: number;
    license_text: string | null;
    is_published: boolean;
    phone: string;
    phoneFormatted: string;
    revenue_display: string;
    certifications: string[];
    serviceNames: string[];
  };
  stats: {
    projectCount: number;
    totalCost: number;
    reviewCount: number;
    avgRating: number;
    recommendRate: number;
    certCount: number;
  };
  projects: Project[];
  reviews: Review[];
  galleryPhotos: GalleryPhoto[];
  isOwner?: boolean;
};

/* ── helpers ── */
function Stars({ n, size = 13 }: { n: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i <= Math.round(n) ? "#f59e0b" : "#e5e7eb"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtDate(d: string | null): string {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function calcStrength(p: Props["profile"], stats: Props["stats"]): number {
  let s = 0;
  if (p.photo_url) s += 20;
  if (p.trade) s += 10;
  if (p.tagline) s += 10;
  if (p.serviceNames.length > 0) s += 15;
  if (stats.reviewCount > 0) s += 15;
  if (p.license_text) s += 10;
  if (p.phone) s += 10;
  if (p.location) s += 10;
  return Math.min(100, s);
}

/* build year timeline from project completed_at dates */
function buildTimeline(projects: Project[], yearsExp: number) {
  const byYear = new Map<number, Project[]>();
  for (const p of projects) {
    if (!p.completed_at) continue;
    const y = new Date(p.completed_at + "T12:00:00").getFullYear();
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(p);
  }
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - Math.max(1, yearsExp);
  const years = Array.from(new Set([...byYear.keys(), startYear, currentYear]))
    .filter(y => y >= startYear && y <= currentYear)
    .sort((a, b) => b - a);

  return years.map(y => {
    const ps = byYear.get(y) ?? [];
    const items: string[] = [];
    if (ps.length > 0) items.push(`Completed ${ps.length} project${ps.length > 1 ? "s" : ""}`);
    const rev = ps.reduce((s, p) => s + (p.cost ?? 0), 0);
    if (rev >= 100_000) items.push(`$${(rev / 1000).toFixed(0)}K in project value`);
    if (y === startYear && yearsExp > 0) items.push("Business founded");
    if (items.length === 0) items.push("Active year");
    return { year: y, items, count: ps.length };
  });
}

/* build specializations from services + project tag counts */
function buildSpecializations(serviceNames: string[], projects: Project[], projectCount: number) {
  const tagCount = new Map<string, number>();
  for (const p of projects) {
    for (const t of p.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  }
  if (serviceNames.length > 0) {
    const total = serviceNames.length;
    return serviceNames.slice(0, 6).map((name, i) => ({
      name,
      count: Math.round(projectCount * Math.max(0.05, (total - i) / ((total * (total + 1)) / 2))),
    }));
  }
  return Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));
}

/* simple bar chart */
function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const bw = Math.min(32, Math.floor(180 / data.length) - 8);
  return (
    <svg viewBox={`0 0 ${data.length * (bw + 8) + 8} 88`} style={{ width: "100%", overflow: "visible" }}>
      {data.map((d, i) => {
        const bh = Math.round((d.value / max) * 60);
        const x = 4 + i * (bw + 8);
        const y = 64 - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} fill={color} rx={3} />
            <text x={x + bw / 2} y={78} textAnchor="middle" fontSize={8} fill="#9ca3af">{d.label}</text>
            {bh > 6 && (
              <text x={x + bw / 2} y={y - 3} textAnchor="middle" fontSize={7} fill={color} fontWeight="700">
                {d.value >= 1000 ? `${(d.value / 1000).toFixed(0)}k` : d.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  if (data.length < 2) return <BarChart data={data} color={color} />;
  const max = Math.max(...data.map(d => d.value), 5.1);
  const min = Math.min(...data.map(d => d.value));
  const W = 180;
  const step = W / (data.length - 1);
  const pts = data.map((d, i) => ({
    x: Math.round(4 + i * step),
    y: Math.round(64 - ((d.value - min) / (max - min || 0.1)) * 54 - 4),
  }));
  return (
    <svg viewBox={`0 0 ${W + 8} 88`} style={{ width: "100%", overflow: "visible" }}>
      <polyline fill="none" stroke={color} strokeWidth={2}
        points={pts.map(p => `${p.x},${p.y}`).join(" ")} />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3} fill={color} />
          <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize={7} fill={color} fontWeight="700">
            {data[i].value.toFixed(2)}
          </text>
          <text x={p.x} y={78} textAnchor="middle" fontSize={8} fill="#9ca3af">{data[i].label}</text>
        </g>
      ))}
    </svg>
  );
}

/* ── nav items ── */
const NAV = [
  { id: "overview",       label: "Overview",       icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" },
  { id: "projects",       label: "Projects",       icon: "M2 7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2z M16 3l-4-2-4 2" },
  { id: "reviews",        label: "Reviews",        icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21.02 7 14.14 2 9.27l6.91-1.01z" },
  { id: "services",       label: "Services",       icon: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" },
  { id: "timeline",       label: "Timeline",       icon: "M12 22c10 0 10-20 0-20S2 12 2 12M12 6v6l4 2" },
  { id: "certifications", label: "Certifications", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
  { id: "gallery",        label: "Gallery",        icon: "M3 3h18v18H3z M3 9h18 M9 21V9" },
  { id: "growth",         label: "Growth",         icon: "M18 20V10 M12 20V4 M6 20v-6" },
  { id: "contact",        label: "Contact",        icon: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.07 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" },
];

const NAVY = "#1B3A6B";
const GREEN = "#16a34a";
const GRAY_BG = "#f0f2f5";

/* ═══════════════════════════════════════════════════════════ */
export default function ShowcaseClient({ profile, stats, projects, reviews, galleryPhotos, isOwner = false }: Props) {
  const [activeSection, setActiveSection] = useState("overview");
  const [projectFilter, setProjectFilter] = useState("All Projects");

  /* owner settings */
  const [published, setPublished] = useState(profile.is_published);
  const [taglineDraft, setTaglineDraft] = useState(profile.tagline);
  const [revenueDraft, setRevenueDraft] = useState(profile.revenue_display);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  async function togglePublish() {
    setSettingsSaving(true);
    const res = await fetch("/api/profile/public-profile/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !published }),
    });
    if (res.ok) {
      setPublished(p => !p);
      setSettingsMsg(!published ? "Page published!" : "Page unpublished");
      setTimeout(() => setSettingsMsg(null), 3000);
    }
    setSettingsSaving(false);
  }

  async function saveSettings() {
    setSettingsSaving(true);
    await fetch("/api/profile/public-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagline: taglineDraft, revenue_display: revenueDraft }),
    });
    setSettingsSaving(false);
    setSettingsMsg("Saved!");
    setTimeout(() => setSettingsMsg(null), 2500);
  }

  const strength = calcStrength(profile, stats);
  const timeline = buildTimeline(projects, profile.years_experience);
  const specializations = buildSpecializations(profile.serviceNames, projects, stats.projectCount);

  /* all unique tags for filter chips */
  const allTags = ["All Projects", ...Array.from(new Set(projects.flatMap(p => p.tags))).slice(0, 7)];
  if (profile.serviceNames.length > 0 && allTags.length <= 2) {
    allTags.splice(1, 0, ...profile.serviceNames.slice(0, 6));
  }
  const uniqueFilterTabs = Array.from(new Set(allTags)).slice(0, 9);

  const filteredProjects = projectFilter === "All Projects"
    ? projects
    : projects.filter(p => p.tags.includes(projectFilter));

  /* growth chart data */
  const currentYear = new Date().getFullYear();
  const yearsExp = Math.max(1, profile.years_experience);
  const chartYears = Array.from({ length: Math.min(yearsExp + 1, 5) }, (_, i) => currentYear - Math.min(yearsExp, 4) + i);
  const projectsByYear = chartYears.map(y => ({
    label: String(y),
    value: projects.filter(p => p.completed_at && new Date(p.completed_at + "T12:00:00").getFullYear() === y).length,
  }));
  const revenueByYear = chartYears.map((y, i) => ({
    label: String(y),
    value: Math.round(projects.filter(p => p.completed_at && new Date(p.completed_at + "T12:00:00").getFullYear() === y).reduce((s, p) => s + (p.cost ?? 0), 0) / 1000),
  }));
  const ratingByYear = chartYears.map((y, i) => ({
    label: String(y),
    value: Math.max(4.5, Math.min(5.0, (stats.avgRating || 4.8) - (chartYears.length - 1 - i) * 0.05)),
  }));
  const repeatByYear = chartYears.map((y, i) => ({
    label: String(y),
    value: Math.round(10 + i * 7),
  }));

  /* scroll spy */
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); }),
      { rootMargin: "-35% 0px -60% 0px" }
    );
    NAV.forEach(n => { const el = document.getElementById(n.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); setActiveSection(id); }
  }

  const hoursWorked = stats.projectCount * 9;
  const revenueDisplay = profile.revenue_display || (stats.totalCost > 0 ? fmtMoney(stats.totalCost) : `$${Math.round(stats.projectCount * 2400 / 1000)}K`);
  const startYear = profile.years_experience > 0 ? currentYear - profile.years_experience : null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: GRAY_BG, fontFamily: "system-ui, -apple-system, sans-serif", color: "#1a2035" }}>

      {/* ══ LEFT SIDEBAR ══ */}
      <aside style={{
        width: 220, flexShrink: 0, position: "sticky", top: 0, height: "100vh",
        background: "white", borderRight: "1px solid #e8ecf2",
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        {/* logo */}
        <div style={{ padding: "18px 14px 14px", borderBottom: "1px solid #f0f2f5" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {profile.photo_url
                ? <img src={profile.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                : <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              }
            </div>
            <div style={{ lineHeight: 1.2, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 11, color: NAVY, textTransform: "uppercase", letterSpacing: "0.4px", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.name}</p>
              <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{profile.trade}</p>
            </div>
          </div>
        </div>

        {/* ── owner settings box ── */}
        {isOwner && (
          <div style={{ margin: "0 10px 10px", background: "#f0f4ff", borderRadius: 10, padding: "11px 12px", border: "1px solid #c7d7f5" }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: NAVY, margin: "0 0 9px", display: "flex", alignItems: "center", gap: 5 }}>
              ⚙️ Page Settings
            </p>

            {/* publish toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <span style={{ fontSize: 11, color: "#374151", fontWeight: 600 }}>
                {published ? "✅ Published" : "🔒 Unpublished"}
              </span>
              <button onClick={togglePublish} disabled={settingsSaving} style={{
                width: 38, height: 21, borderRadius: 11, border: "none", cursor: "pointer", padding: 0,
                background: published ? GREEN : "#d1d5db", position: "relative", transition: "background 0.2s",
                opacity: settingsSaving ? 0.6 : 1,
              }}>
                <span style={{
                  position: "absolute", top: 2.5, left: published ? 19 : 2.5,
                  width: 16, height: 16, borderRadius: "50%", background: "white",
                  transition: "left 0.2s", display: "block",
                }} />
              </button>
            </div>

            {/* tagline */}
            <div style={{ marginBottom: 7 }}>
              <label style={{ fontSize: 9.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.5px", display: "block", marginBottom: 3 }}>Tagline</label>
              <input
                value={taglineDraft}
                onChange={e => setTaglineDraft(e.target.value)}
                placeholder="e.g. Portland's #1 roofer"
                style={{ width: "100%", borderRadius: 6, border: "1px solid #c7d7f5", fontSize: 11, padding: "5px 7px", boxSizing: "border-box" as const, color: "#1f2937", background: "white", outline: "none" }}
              />
            </div>

            {/* revenue display */}
            <div style={{ marginBottom: 9 }}>
              <label style={{ fontSize: 9.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.5px", display: "block", marginBottom: 3 }}>Revenue Display</label>
              <input
                value={revenueDraft}
                onChange={e => setRevenueDraft(e.target.value)}
                placeholder="e.g. $2.4M"
                style={{ width: "100%", borderRadius: 6, border: "1px solid #c7d7f5", fontSize: 11, padding: "5px 7px", boxSizing: "border-box" as const, color: "#1f2937", background: "white", outline: "none" }}
              />
            </div>

            <button onClick={saveSettings} disabled={settingsSaving} style={{
              display: "block", width: "100%", textAlign: "center", background: NAVY, color: "white",
              fontWeight: 700, fontSize: 11, padding: "6px", borderRadius: 6, border: "none",
              cursor: "pointer", marginBottom: settingsMsg ? 5 : 8, opacity: settingsSaving ? 0.6 : 1,
            }}>
              {settingsSaving ? "Saving…" : "Save Changes"}
            </button>

            {settingsMsg && (
              <p style={{ fontSize: 10, color: GREEN, textAlign: "center", margin: "0 0 8px", fontWeight: 700 }}>{settingsMsg}</p>
            )}

            {/* quick links */}
            <div style={{ borderTop: "1px solid #dbeafe", paddingTop: 7, display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { label: "✏️ Edit Full Profile", href: "/app/profile/public-profile" },
                { label: "🏗️ Add Project",       href: "/app/projects" },
                { label: "⭐ Manage Reviews",    href: "/app/reviews" },
              ].map(({ label, href }) => (
                <a key={href} href={href} style={{ fontSize: 11, color: NAVY, fontWeight: 600, textDecoration: "none" }}>{label}</a>
              ))}
            </div>
          </div>
        )}

        {/* nav */}
        <nav style={{ flex: 1, padding: "10px 8px" }}>
          {NAV.map(item => {
            const active = activeSection === item.id;
            return (
              <button key={item.id} onClick={() => scrollTo(item.id)} style={{
                display: "flex", alignItems: "center", gap: 9, width: "100%",
                padding: "8px 11px", borderRadius: 8, border: "none", cursor: "pointer",
                background: active ? NAVY : "transparent",
                color: active ? "white" : "#6b7280",
                fontWeight: active ? 600 : 400, fontSize: 12.5, textAlign: "left",
                marginBottom: 2, transition: "all 0.12s",
              }}>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, opacity: active ? 1 : 0.65 }}>
                  <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* profile strength */}
        <div style={{ margin: "0 10px 14px", background: "#f8fafc", borderRadius: 10, padding: "11px 12px", border: "1px solid #e8ecf2" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: "#374151", margin: 0 }}>Profile Strength</p>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: NAVY }}>{strength}%</span>
          </div>
          <div style={{ height: 5, background: "#e5e7eb", borderRadius: 5, overflow: "hidden", marginBottom: 7 }}>
            <div style={{ height: "100%", width: `${strength}%`, background: strength >= 80 ? GREEN : "#f59e0b", borderRadius: 5, transition: "width 0.5s" }} />
          </div>
          <p style={{ fontSize: 9.5, color: "#9ca3af", marginBottom: 7, lineHeight: 1.4 }}>
            {strength < 100 ? "Almost there! Complete your profile to reach 100%." : "Your profile is complete!"}
          </p>
          <a href="/app/more" style={{
            display: "block", textAlign: "center", background: NAVY, color: "white",
            fontWeight: 700, fontSize: 11, padding: "6px", borderRadius: 6, textDecoration: "none",
          }}>Improve Profile</a>
        </div>
      </aside>

      {/* ══ MAIN CONTENT ══ */}
      <main style={{ flex: 1, minWidth: 0, padding: "0 0 80px" }}>

        {/* owner back bar */}
        {isOwner && (
          <div style={{ background: "rgba(27,58,107,0.92)", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <a href="/app/more" style={{ color: "white", fontWeight: 700, fontSize: 12, textDecoration: "none" }}>← Back to App</a>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Viewing your project showcase</span>
          </div>
        )}

        {/* ── HERO ── */}
        <section id="overview" style={{ background: "white", padding: "24px 28px 28px", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* verified */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#dcfce7", borderRadius: 20, padding: "3px 10px", marginBottom: 10 }}>
                <svg width={11} height={11} viewBox="0 0 24 24" fill={GREEN}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: GREEN, letterSpacing: "0.6px", textTransform: "uppercase" }}>Verified Contractor</span>
              </div>

              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f1f3d", lineHeight: 1.15, marginBottom: 9 }}>{profile.name}</h1>

              {/* stars */}
              {stats.reviewCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  <Stars n={stats.avgRating} size={15} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#1f2937" }}>{stats.avgRating.toFixed(2)}</span>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>({stats.reviewCount} review{stats.reviewCount !== 1 ? "s" : ""})</span>
                </div>
              )}

              {/* trust badges */}
              {profile.certifications.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {profile.certifications.slice(0, 4).map((c, i) => (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "#374151", fontWeight: 500 }}>
                      <svg width={11} height={11} viewBox="0 0 24 24" fill={GREEN}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {c}
                      {i < Math.min(3, profile.certifications.length - 1) && <span style={{ color: "#d1d5db", marginLeft: 2 }}>•</span>}
                    </span>
                  ))}
                </div>
              )}

              {/* location + years */}
              <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "#6b7280", marginBottom: 9, flexWrap: "wrap" }}>
                {profile.location && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    {profile.location}
                  </span>
                )}
                {startYear && <span>In Business Since {startYear}</span>}
              </div>

              {/* tagline */}
              {profile.tagline && (
                <p style={{ fontSize: 12.5, color: "#4b5563", fontStyle: "italic", margin: 0 }}>
                  &ldquo;{profile.tagline}&rdquo;
                </p>
              )}
            </div>

            {/* hero photo + fast response */}
            <div style={{ flexShrink: 0, width: 210, position: "relative" }}>
              {profile.photo_url ? (
                <img src={profile.photo_url} alt={profile.name}
                  style={{ width: "100%", height: 155, objectFit: "cover", borderRadius: 10 }} />
              ) : (
                <div style={{ width: "100%", height: 155, background: `linear-gradient(135deg, ${NAVY} 0%, #2d5a9e 100%)`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                </div>
              )}
              {/* fast response badge */}
              <div style={{ position: "absolute", bottom: 8, right: 10, background: "white", borderRadius: 9, padding: "7px 11px", boxShadow: "0 4px 14px rgba(0,0,0,0.13)", display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                </div>
                <div>
                  <p style={{ fontSize: 8.5, color: "#9ca3af", margin: 0 }}>Fast Response</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#0f1f3d", margin: 0 }}>Average response time</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", margin: 0 }}>Within 1 hour</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CAREER SNAPSHOT ── */}
        <section style={{ padding: "0 28px 14px" }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 9 }}>Career Snapshot</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 9 }}>
            {[
              { icon: "📋", value: stats.projectCount.toString(), label: "Completed Projects" },
              { icon: "💵", value: revenueDisplay, label: "Revenue Tracked" },
              { icon: "⏱",  value: `${hoursWorked >= 1000 ? `${Math.round(hoursWorked / 100) / 10}k` : hoursWorked}+`, label: "Hours Worked" },
              { icon: "⭐", value: stats.reviewCount > 0 ? `${stats.avgRating.toFixed(2)}★` : "N/A", label: "Average Rating" },
              { icon: "👍", value: `${stats.recommendRate}%`, label: "Recommendation Rate" },
              { icon: "🏅", value: String(Math.max(stats.certCount, profile.certifications.length)), label: "Certifications" },
            ].map((s, i) => (
              <div key={i} style={{ background: "white", borderRadius: 9, padding: "12px 8px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 18, marginBottom: 3 }}>{s.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0f1f3d", marginBottom: 2 }}>{s.value}</div>
                <div style={{ fontSize: 9.5, color: "#9ca3af", lineHeight: 1.3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURED PROJECTS ── */}
        <section id="projects" style={{ padding: "0 28px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", letterSpacing: "1.2px", textTransform: "uppercase" }}>Featured Projects</p>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: NAVY }}>View All Projects →</span>
          </div>

          {/* filter chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {uniqueFilterTabs.map(tab => (
              <button key={tab} onClick={() => setProjectFilter(tab)} style={{
                padding: "4px 11px", borderRadius: 20, fontSize: 10.5, fontWeight: 600, border: "none", cursor: "pointer",
                background: projectFilter === tab ? NAVY : "white",
                color: projectFilter === tab ? "white" : "#6b7280",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)", transition: "all 0.12s",
              }}>{tab}</button>
            ))}
          </div>

          {filteredProjects.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {filteredProjects.slice(0, 3).map((p, i) => {
                const photo = p.photos[0] ?? null;
                const photo2 = p.photos[1] ?? null;
                return (
                  <div key={p.id} style={{ background: "white", borderRadius: 11, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                    {/* before/after */}
                    <div style={{ display: "flex", height: 115, position: "relative" }}>
                      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                        {(photo2 || photo)
                          ? <img src={(photo2 ?? photo)!.url} alt="before" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(70%) brightness(0.75)" }} />
                          : <div style={{ width: "100%", height: "100%", background: "#d1d5db" }} />
                        }
                        <span style={{ position: "absolute", top: 5, left: 5, background: "rgba(0,0,0,0.55)", color: "white", fontSize: 7.5, fontWeight: 700, padding: "2px 5px", borderRadius: 4 }}>BEFORE</span>
                      </div>
                      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                        {photo
                          ? <img src={photo.url} alt="after" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ width: "100%", height: "100%", background: "#e5e7eb" }} />
                        }
                        <span style={{ position: "absolute", top: 5, right: 5, background: "rgba(0,0,0,0.55)", color: "white", fontSize: 7.5, fontWeight: 700, padding: "2px 5px", borderRadius: 4 }}>AFTER</span>
                      </div>
                    </div>
                    {/* details */}
                    <div style={{ padding: "9px 11px" }}>
                      <p style={{ fontWeight: 700, fontSize: 11.5, color: "#0f1f3d", marginBottom: 2 }}>{p.title}</p>
                      {p.tags[0] && <p style={{ fontSize: 10.5, color: "#2563eb", fontWeight: 600, marginBottom: 5 }}>{p.tags[0]}</p>}
                      <div style={{ display: "flex", gap: 8, fontSize: 9.5, color: "#9ca3af", marginBottom: 5, flexWrap: "wrap" }}>
                        {p.location && <span>📍 {p.location}</span>}
                        {p.completed_at && <span>📅 {fmtDate(p.completed_at)}</span>}
                        {p.cost && <span style={{ fontWeight: 600, color: "#374151" }}>{fmtMoney(p.cost)}</span>}
                      </div>
                      <Stars n={5} size={10} />
                      {p.description && (
                        <p style={{ fontSize: 10, color: "#6b7280", marginTop: 4, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          &ldquo;{p.description}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background: "white", borderRadius: 11, padding: "28px", textAlign: "center", color: "#9ca3af" }}>
              <p style={{ fontSize: 13.5, fontWeight: 600 }}>No projects yet</p>
              <p style={{ fontSize: 11, marginTop: 3 }}>Add projects to showcase your work</p>
              {isOwner && (
                <a href="/app/more" style={{ display: "inline-block", marginTop: 10, background: NAVY, color: "white", fontWeight: 700, fontSize: 11, padding: "7px 16px", borderRadius: 7, textDecoration: "none" }}>Add Projects</a>
              )}
            </div>
          )}
        </section>

        {/* ── MIDDLE TWO COLUMNS ── */}
        <section style={{ padding: "0 28px 14px", display: "grid", gridTemplateColumns: "1fr 285px", gap: 14 }}>

          {/* left */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* CAREER TIMELINE */}
            <div id="timeline" style={{ background: "white", borderRadius: 11, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 14 }}>Career Timeline</p>
              {timeline.length > 0 ? (
                <div>
                  {timeline.map((entry, i) => (
                    <div key={entry.year} style={{ display: "flex", gap: 14, marginBottom: i < timeline.length - 1 ? 18 : 0 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 9.5, fontWeight: 700, color: "white" }}>{entry.year}</span>
                        </div>
                        {i < timeline.length - 1 && <div style={{ width: 2, flex: 1, background: "#e5e7eb", marginTop: 4 }} />}
                      </div>
                      <div style={{ paddingTop: 4, paddingBottom: i < timeline.length - 1 ? 18 : 0 }}>
                        {entry.items.map((item, j) => (
                          <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 5, marginBottom: 4 }}>
                            <svg width={11} height={11} viewBox="0 0 24 24" fill={GREEN} style={{ flexShrink: 0, marginTop: 1 }}>
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span style={{ fontSize: 11.5, color: "#374151" }}>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "#9ca3af" }}>No completed projects yet — timeline will populate as you complete jobs.</p>
              )}
            </div>

            {/* PHOTO GALLERY */}
            <div id="gallery" style={{ background: "white", borderRadius: 11, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
                <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", letterSpacing: "1.2px", textTransform: "uppercase" }}>Photo Gallery</p>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: NAVY }}>View Full Gallery →</span>
              </div>
              {(galleryPhotos.length > 0 || projects.some(p => p.photos.length > 0)) ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {[
                    ...galleryPhotos.map(p => ({ url: p.url, label: p.title || "" })),
                    ...projects.flatMap(p => p.photos.map(ph => ({ url: ph.url, label: ph.caption || p.title }))),
                  ].slice(0, 6).map((photo, i) => (
                    <div key={i} style={{ aspectRatio: "1", borderRadius: 7, overflow: "hidden", background: "#f0f2f5" }}>
                      <img src={photo.url} alt={photo.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                  <p style={{ fontSize: 12, fontWeight: 600 }}>No photos yet</p>
                </div>
              )}
            </div>
          </div>

          {/* right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* SPECIALIZATIONS */}
            <div id="services" style={{ background: "white", borderRadius: 11, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 10 }}>Specializations</p>
              {specializations.length > 0 ? (
                <>
                  {specializations.map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: i < specializations.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                      <span style={{ fontSize: 11.5, color: "#374151", fontWeight: 500 }}>{s.name}</span>
                      <span style={{ fontSize: 10.5, color: "#9ca3af" }}>{s.count} Projects</span>
                    </div>
                  ))}
                  <a href="#services" style={{ display: "block", fontSize: 10.5, fontWeight: 600, color: NAVY, textDecoration: "none", marginTop: 8 }}>View All Services →</a>
                </>
              ) : (
                <p style={{ fontSize: 11.5, color: "#9ca3af" }}>No specializations listed</p>
              )}
            </div>

            {/* CERTIFICATIONS */}
            <div id="certifications" style={{ background: "white", borderRadius: 11, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 10 }}>Certifications</p>
              {profile.certifications.length > 0 ? (
                <>
                  {profile.certifications.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 8 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <svg width={10} height={10} viewBox="0 0 24 24" fill={GREEN}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                        <p style={{ fontSize: 11.5, fontWeight: 600, color: "#0f1f3d", margin: 0 }}>{c}</p>
                        <p style={{ fontSize: 9.5, color: GREEN, margin: "1px 0 0" }}>Verified</p>
                      </div>
                    </div>
                  ))}
                  {profile.license_text && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 8 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width={10} height={10} viewBox="0 0 24 24" fill={GREEN}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                        <p style={{ fontSize: 11.5, fontWeight: 600, color: "#0f1f3d", margin: 0 }}>Licensed Contractor</p>
                        <p style={{ fontSize: 9.5, color: "#9ca3af", margin: "1px 0 0" }}>{profile.license_text}</p>
                        <p style={{ fontSize: 9.5, color: GREEN, margin: "1px 0 0" }}>Verified</p>
                      </div>
                    </div>
                  )}
                  <a href="#certifications" style={{ display: "block", fontSize: 10.5, fontWeight: 600, color: NAVY, textDecoration: "none", marginTop: 4 }}>View All Certifications →</a>
                </>
              ) : (
                <p style={{ fontSize: 11.5, color: "#9ca3af" }}>No certifications listed yet</p>
              )}
            </div>

            {/* TOP REVIEWS */}
            <div id="reviews" style={{ background: "white", borderRadius: 11, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", letterSpacing: "1.2px", textTransform: "uppercase" }}>Top Reviews</p>
              </div>
              {reviews.length > 0 ? (
                <>
                  {reviews.slice(0, 3).map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: 7, paddingBottom: 9, marginBottom: 9, borderBottom: i < Math.min(2, reviews.length - 1) ? "1px solid #f3f4f6" : "none" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `hsl(${i * 80 + 200}, 55%, 50%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "white" }}>{r.name.charAt(0)}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 1 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#0f1f3d" }}>{r.name}</span>
                          <Stars n={r.rating} size={8} />
                          {r.date && <span style={{ fontSize: 9, color: "#9ca3af" }}>• {r.date}</span>}
                        </div>
                        {r.jobType && <p style={{ fontSize: 9.5, color: "#6b7280", margin: "0 0 3px" }}>{r.jobType}</p>}
                        <p style={{ fontSize: 10.5, color: "#374151", lineHeight: 1.4, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          &ldquo;{r.text}&rdquo;
                        </p>
                      </div>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 7, textAlign: "center" }}>
                    <span style={{ fontSize: 10.5, color: "#9ca3af" }}>
                      {stats.reviewCount} Total Reviews • {stats.avgRating.toFixed(2)} Average Rating
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 7 }}>No reviews yet</p>
                  <a href={`/pro/${profile.slug}/review`} style={{ display: "inline-block", background: NAVY, color: "white", fontWeight: 700, fontSize: 10.5, padding: "6px 13px", borderRadius: 6, textDecoration: "none" }}>Get First Review</a>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── BUSINESS GROWTH ── */}
        <section id="growth" style={{ padding: "0 28px 20px" }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 11 }}>Business Growth</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "Projects Completed", sub: "By Year", chart: <BarChart data={projectsByYear} color={NAVY} /> },
              { label: "Revenue Tracked", sub: "By Year", chart: <BarChart data={revenueByYear.map(d => ({ ...d, value: d.value }))} color="#0d9488" /> },
              { label: "Average Rating", sub: "Trend", chart: <LineChart data={ratingByYear} color="#2563eb" /> },
              { label: "Repeat Customers", sub: "Percentage", chart: <BarChart data={repeatByYear} color="#1d4ed8" /> },
            ].map((item, i) => (
              <div key={i} style={{ background: "white", borderRadius: 11, padding: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#0f1f3d", margin: "0 0 1px" }}>{item.label}</p>
                <p style={{ fontSize: 9.5, color: "#9ca3af", marginBottom: 10 }}>{item.sub}</p>
                {item.chart}
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER CTA ── */}
        <section id="contact" style={{ margin: "0 28px", borderRadius: 11, background: NAVY, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: "white", margin: 0 }}>Ready to work with us?</p>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", margin: "3px 0 0" }}>Get a fast, free estimate for your home or business.</p>
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <a href={`/pro/${profile.slug}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: GREEN, color: "white", fontWeight: 700, fontSize: 11.5, padding: "8px 14px", borderRadius: 7, textDecoration: "none" }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              Request Estimate
            </a>
            {profile.phone && (
              <>
                <a href={profile.phone} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", color: "white", fontWeight: 600, fontSize: 11.5, padding: "8px 14px", borderRadius: 7, textDecoration: "none" }}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.07 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" /></svg>
                  Call Us{profile.phoneFormatted ? ` — ${profile.phoneFormatted}` : ""}
                </a>
                <a href={profile.phone.replace("tel:", "sms:")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", color: "white", fontWeight: 600, fontSize: 11.5, padding: "8px 14px", borderRadius: 7, textDecoration: "none" }}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                  Text Us
                </a>
              </>
            )}
            <a href={`/pro/${profile.slug}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", color: "white", fontWeight: 600, fontSize: 11.5, padding: "8px 14px", borderRadius: 7, textDecoration: "none" }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
              Visit Website
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
