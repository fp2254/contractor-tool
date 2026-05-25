"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  CONTRACTORS as MOCK_CONTRACTORS, PROJECTS, TRENDING_SEARCHES, SERVICES, CITIES,
  type Contractor, type Project,
} from "./mockData";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <p className="text-sm text-gray-400 animate-pulse">Loading map…</p>
    </div>
  ),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Tailwind's content scanner can't detect dynamic class names like
// `bg-gradient-to-br ${c.cover_color}`. Convert them to real CSS instead.
const TW: Record<string, string> = {
  "slate-500":"#64748b","slate-600":"#475569","slate-700":"#334155","slate-800":"#1e293b","slate-900":"#0f172a",
  "gray-500":"#6b7280","gray-800":"#1f2937","gray-900":"#111827",
  "stone-500":"#78716c","stone-600":"#57534e","stone-700":"#44403c","stone-800":"#292524","zinc-800":"#27272a",
  "red-700":"#b91c1c","red-800":"#991b1b",
  "rose-700":"#be123c","rose-900":"#881337",
  "orange-600":"#ea580c","orange-700":"#c2410c","orange-900":"#7c2d12",
  "amber-600":"#d97706","amber-700":"#b45309","amber-900":"#78350f",
  "yellow-500":"#eab308","yellow-600":"#ca8a04","yellow-700":"#a16207","yellow-800":"#854d0e","yellow-900":"#713f12",
  "lime-700":"#4d7c0f",
  "green-600":"#16a34a","green-700":"#15803d","green-800":"#166534","green-900":"#14532d",
  "emerald-900":"#064e3b","emerald-950":"#022c22",
  "teal-800":"#115e59","teal-900":"#134e4a",
  "cyan-600":"#0891b2","cyan-700":"#0e7490",
  "sky-600":"#0284c7",
  "blue-600":"#2563eb","blue-700":"#1d4ed8","blue-900":"#1e3a8a","indigo-900":"#312e81",
  "violet-700":"#6d28d9",
  "purple-700":"#7e22ce","purple-900":"#581c87",
};
function coverGradient(cover_color: string): string {
  const parts = cover_color.split(" ");
  const from = TW[parts.find(p => p.startsWith("from-"))?.slice(5) ?? ""] ?? "#334155";
  const to   = TW[parts.find(p => p.startsWith("to-"))?.slice(3) ?? ""]   ?? "#0f172a";
  return `linear-gradient(135deg, ${from}, ${to})`;
}

function Img({ src, alt = "", className = "", h }: { src: string; alt?: string; className?: string; h?: number }) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={h ? { height: h } : undefined}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  );
}

function TrustBadge({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${color}`}>
      {icon} {label}
    </span>
  );
}

function StarRow({ rating, count, source, color = "text-yellow-400" }: { rating: number; count: number; source: string; color?: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`${color} text-xs`}>★</span>
      <span className="text-xs font-bold text-slate-800">{rating.toFixed(1)}</span>
      <span className="text-[10px] text-gray-400">{source} ({count})</span>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header() {
  return (
    <header style={{ backgroundColor: "#1B3A6B" }} className="sticky top-0 z-40 shadow-md flex-shrink-0">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-white font-bold text-lg tracking-tight">🏠 TradeBase</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/find-contractors" className="text-white text-sm font-semibold border-b-2 border-white pb-0.5">Find Contractors</Link>
          <Link href="/find-contractors" className="text-blue-200 text-sm font-medium hover:text-white transition-colors">Projects Near You</Link>
          <Link href="/auth/login" className="text-blue-200 text-sm font-medium hover:text-white transition-colors">For Contractors</Link>
        </nav>
        <Link href="/auth/signup" className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-xl text-white border-2 border-white/40 hover:bg-white/10 transition-colors">
          Join TradeBase
        </Link>
      </div>
    </header>
  );
}

// ─── Search Bar with Suggestions ──────────────────────────────────────────────

function SearchBar({
  query, setQuery, service, setService, city, setCity, distance, setDistance,
  onSurpriseMe, onShowFilters, activeFilterCount,
}: {
  query: string; setQuery: (v: string) => void;
  service: string; setService: (v: string) => void;
  city: string; setCity: (v: string) => void;
  distance: string; setDistance: (v: string) => void;
  onSurpriseMe: () => void;
  onShowFilters: () => void;
  activeFilterCount: number;
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return SERVICES.filter((s) => s !== "All Services" && s.toLowerCase().includes(q)).slice(0, 5);
  }, [query]);

  const showDropdown = focused && (query.trim().length === 0 || suggestions.length > 0);

  const selCls = "h-9 bg-white border border-gray-200 rounded-lg px-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 text-slate-700";

  return (
    <div className="bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
      <div className="px-4 pt-2.5 pb-1.5 flex items-center gap-2 flex-wrap">
        {/* Search input with dropdown */}
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search roofing, plumbing, HVAC…"
            className="w-full h-9 rounded-lg border border-gray-200 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          />
          {showDropdown && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              {query.trim().length === 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-3 pt-2.5 pb-1">🔥 Trending searches</p>
                  {TRENDING_SEARCHES.map((s) => (
                    <button key={s} onMouseDown={() => { setQuery(s); setFocused(false); }}
                      className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-gray-50 flex items-center gap-2">
                      <span className="text-gray-400 text-xs">↗</span> {s}
                    </button>
                  ))}
                </div>
              )}
              {suggestions.map((s) => (
                <button key={s} onMouseDown={() => { setQuery(s); setService(s); setFocused(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50">
                  <span className="text-blue-400 text-xs">🔍</span> {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <select value={service} onChange={(e) => setService(e.target.value)} className={`${selCls} min-w-[130px]`}>
          {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={city} onChange={(e) => setCity(e.target.value)} className={`${selCls} min-w-[140px]`}>
          <option value="">All Locations</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={distance} onChange={(e) => setDistance(e.target.value)} className={`${selCls} w-28`}>
          <option value="50">Any distance</option>
          <option value="5">Within 5 mi</option>
          <option value="10">Within 10 mi</option>
          <option value="25">Within 25 mi</option>
        </select>
        <button onClick={onShowFilters}
          className="h-9 flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-slate-700 bg-white hover:bg-gray-50 transition-colors relative flex-shrink-0">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M10 12h4" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: "#1B3A6B" }}>
              {activeFilterCount}
            </span>
          )}
        </button>
        <button onClick={onSurpriseMe}
          className="h-9 flex items-center gap-1 rounded-lg border border-purple-200 px-3 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors flex-shrink-0">
          🎲 Surprise Me
        </button>
      </div>

      {/* Trending search chips */}
      <div className="flex items-center gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] text-gray-400 font-semibold flex-shrink-0">Trending:</span>
        {TRENDING_SEARCHES.map((s) => (
          <button key={s} onClick={() => { setQuery(s); setService(s === "Roofing" || SERVICES.includes(s) ? s : "All Services"); }}
            className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
              query === s || service === s
                ? "border-blue-500 text-blue-700 bg-blue-50"
                : "border-gray-200 text-gray-500 bg-white hover:border-gray-300"
            }`}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Recent Projects Carousel ─────────────────────────────────────────────────

function RecentProjectsCarousel({
  projects, onHoverContractor, onLeaveContractor, onSelectProject,
}: {
  projects: Project[];
  onHoverContractor: (id: string) => void;
  onLeaveContractor: () => void;
  onSelectProject: (p: Project) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: "left" | "right") {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 230 : -230, behavior: "smooth" });
  }

  return (
    <div className="bg-white border-b-2 border-gray-100 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <div>
          <p className="text-sm font-bold text-slate-800 leading-tight">Recent Projects Near You</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Real completed work by local contractors</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => scroll("left")}
            className="w-7 h-7 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center text-slate-500 hover:bg-gray-50 hover:border-gray-300 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => scroll("right")}
            className="w-7 h-7 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center text-slate-500 hover:bg-gray-50 hover:border-gray-300 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700 border border-blue-200 rounded-full px-2.5 py-1 hover:bg-blue-50 transition-colors ml-1">
            See all →
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-3.5 px-4 scrollbar-none scroll-smooth">
        {projects.map((p) => (
          <div
            key={p.id}
            onMouseEnter={() => onHoverContractor(p.contractor_id)}
            onMouseLeave={onLeaveContractor}
            onClick={() => onSelectProject(p)}
            className="flex-shrink-0 w-[210px] rounded-2xl overflow-hidden border border-gray-100 bg-white hover:border-blue-200 hover:shadow-xl transition-all duration-200 cursor-pointer group"
          >
            {/* Photo */}
            <div className="relative w-full bg-gray-200 overflow-hidden" style={{ height: 140 }}>
              <Img
                src={p.photo}
                alt={p.title}
                className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              {/* Trade tag */}
              <span className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-700 shadow-sm">
                {p.trade}
              </span>
              {/* Time */}
              <span className="absolute top-2 right-2 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-black/40 text-white">
                {p.time_ago}
              </span>
              {/* Preview hint on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-white/90 text-slate-700 shadow-md">
                  👆 Preview on map
                </span>
              </div>
              {/* Title overlay */}
              <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2">
                <p className="text-white font-bold text-xs leading-tight line-clamp-1 drop-shadow">{p.title}</p>
                <p className="text-white/80 text-[9px] mt-0.5">📍 {p.location}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-2.5 py-2">
              {/* Contractor */}
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[8px] font-black flex-shrink-0" style={{ backgroundColor: p.avatar_color }}>
                  {p.contractor_name.charAt(0)}
                </div>
                <span className="text-[10px] font-semibold text-gray-600 line-clamp-1">{p.contractor_name}</span>
              </div>
              {/* Buttons */}
              <div className="flex gap-1.5">
                <Link href={`/project/${p.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-center text-[9px] font-bold py-1.5 rounded-lg border border-gray-200 text-slate-600 hover:border-blue-300 hover:text-blue-700 transition-colors">
                  View Project
                </Link>
                <Link href={`/pro/${p.contractor_slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-center text-[9px] font-bold py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#1B3A6B" }}>
                  Contractor
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Trending Local Stats ─────────────────────────────────────────────────────

function TrendingStatsRow({ contractors }: { contractors: Contractor[] }) {
  const fastest = contractors.reduce((a, b) => {
    const aTime = parseInt(a.response_time.replace(/\D/g, "")) || 99;
    const bTime = parseInt(b.response_time.replace(/\D/g, "")) || 99;
    return aTime < bTime ? a : b;
  }, contractors[0]);

  const topRated = [...contractors].sort((a, b) => b.rating_google - a.rating_google)[0];
  const veteranCount = contractors.filter((c) => c.veteran_owned).length;

  if (!fastest || !topRated) return null;

  return (
    <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-100 px-3 py-2.5 flex gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
      <StatChip icon="⚡" label="Fastest Response" value={fastest.name.split(" ")[0]} sub={fastest.response_time} />
      <StatChip icon="⭐" label="Top Rated" value={`${topRated.rating_google}★`} sub={`${topRated.reviews_google} reviews`} />
      <StatChip icon="✓" label="TB Verified" value={`${contractors.filter((c) => c.verified).length}`} sub="in this area" />
      {veteranCount > 0 && (
        <StatChip icon="🎖" label="Veteran Owned" value={`${veteranCount}`} sub="contractor(s)" />
      )}
      <StatChip icon="🚨" label="Emergency" value={`${contractors.filter((c) => c.emergency).length}`} sub="available 24/7" />
    </div>
  );
}

function StatChip({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div className="flex-shrink-0 bg-white rounded-xl px-2.5 py-1.5 border border-gray-100 shadow-sm flex items-center gap-2 min-w-[130px]">
      <span className="text-base leading-none">{icon}</span>
      <div>
        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-[11px] font-bold text-slate-800 leading-tight">{value}</p>
        <p className="text-[9px] text-gray-400">{sub}</p>
      </div>
    </div>
  );
}

// ─── Contractor Card ─────────────────────────────────────────────────────────

function ContractorCard({
  c, hovered, selected, onHover, onLeave, onSelect,
}: {
  c: Contractor; hovered: boolean; selected: boolean;
  onHover: () => void; onLeave: () => void; onSelect: () => void;
}) {
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onSelect}
      style={{ flexShrink: 0, minHeight: 360 }}
      className={`bg-white rounded-2xl overflow-hidden shadow-sm border-2 transition-all duration-150 cursor-pointer ${
        selected
          ? "border-blue-500 shadow-lg ring-2 ring-blue-100"
          : hovered
          ? "border-blue-200 shadow-md -translate-y-0.5"
          : "border-transparent hover:border-gray-100 hover:shadow-md"
      }`}
    >
      {/* Cover */}
      <div style={{ position: "relative" }}>
        <div style={{ position: "relative", height: 160, width: "100%", overflow: "hidden", background: coverGradient(c.cover_color) }}>
          <Img src={c.cover_photo} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
        </div>

        {/* Top badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
          {c.featured && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400 text-yellow-900 shadow-sm">⭐ Featured</span>
          )}
          {c.verified && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-sm" style={{ backgroundColor: "#1B3A6B" }}>✓ TB Verified</span>
          )}
        </div>
        {c.emergency && (
          <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white shadow-sm">🚨 24/7</span>
        )}

        {/* Avatar */}
        <div className="absolute -bottom-4 left-4 w-10 h-10 rounded-xl border-2 border-white shadow-md flex items-center justify-center text-white font-black text-sm" style={{ backgroundColor: c.avatar_color }}>
          {c.name.charAt(0)}
        </div>

        {/* Stats pill */}
        <div className="absolute -bottom-3 right-3.5 bg-white rounded-full px-2.5 py-0.5 shadow-sm border border-gray-100 flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-gray-600">{c.jobs_completed.toLocaleString("en-US")} jobs</span>
          <span className="text-gray-200">·</span>
          <span className="text-[10px] font-bold text-gray-600">{c.years_in_business}y exp</span>
        </div>
      </div>

      {/* Body */}
      <div className="pt-7 px-4 pb-3.5">
        {/* Name row */}
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <div>
            <p className="font-bold text-slate-800 text-sm leading-tight">{c.name}</p>
            <p className="text-[11px] text-gray-400 leading-tight">{c.tagline}</p>
          </div>
          <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5 whitespace-nowrap">📍 {c.distance} mi</span>
        </div>

        {/* Trade + city */}
        <div className="flex items-center gap-1.5 mt-2 mb-2.5 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{c.trade}</span>
          <span className="text-[10px] text-gray-400">{c.location}</span>
        </div>

        {/* Dual ratings */}
        <div className="bg-gray-50 rounded-xl px-3 py-2 mb-2.5 space-y-1">
          <StarRow rating={c.rating_google} count={c.reviews_google} source="Google" />
          {c.verified && (
            <div className="flex items-center gap-1">
              <span className="text-blue-500 text-xs">★</span>
              <span className="text-xs font-bold text-slate-800">{c.rating_tb.toFixed(1)}</span>
              <span className="text-[10px] text-gray-400">TradeBase ({c.verified_projects} verified projects)</span>
            </div>
          )}
        </div>

        {/* Trust badges */}
        <div className="flex gap-1 flex-wrap mb-2.5">
          {c.licensed && <TrustBadge icon="🏛" label="Licensed" color="bg-green-50 text-green-700" />}
          {c.insured && <TrustBadge icon="🛡" label="Insured" color="bg-emerald-50 text-emerald-700" />}
          {c.veteran_owned && <TrustBadge icon="🎖" label="Veteran" color="bg-amber-50 text-amber-700" />}
          {c.emergency && <TrustBadge icon="⚡" label="Emergency" color="bg-red-50 text-red-600" />}
        </div>

        {/* Description */}
        <p className="text-[11px] text-gray-500 line-clamp-2 mb-2.5 leading-relaxed">{c.description}</p>

        {/* Project photo row */}
        {c.project_photos.length > 0 && (
          <div className="flex gap-1.5 mb-3">
            {c.project_photos.map((photo, i) => (
              <div key={i} className="flex-1 rounded-lg overflow-hidden" style={{ height: 52, background: coverGradient(c.cover_color) }}>
                <img src={photo} alt="" className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }} />
              </div>
            ))}
            <div className="flex-shrink-0 w-10 h-[52px] rounded-lg bg-gray-50 border border-gray-100 flex flex-col items-center justify-center">
              <span className="text-[9px] font-bold text-gray-400 text-center leading-tight">+more</span>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-3 text-[10px] text-gray-500">
          <span>🕐 Responds {c.response_time}</span>
          {c.repeat_customers > 0 && <span>🔄 {c.repeat_customers}% repeat</span>}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Link href={`/pro/${c.slug}`} onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded-xl py-2 text-center text-xs font-bold border-2 text-slate-600 border-gray-200 hover:border-blue-200 hover:text-blue-700 transition-colors">
            View Profile
          </Link>
          <button onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded-xl py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-sm"
            style={{ backgroundColor: "#1B3A6B" }}>
            Request Quote
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Map Floating Card ─────────────────────────────────────────────────────────

function MapFloatingCard({
  contractor, project, onClose,
}: {
  contractor: Contractor;
  project: Project | null;
  onClose: () => void;
}) {
  const c = contractor;
  const heroSrc = project ? project.photo : c.cover_photo;
  const heroBg = coverGradient(c.cover_color);

  return (
    <div
      className="absolute bottom-6 left-1/2 z-[500] w-[380px] rounded-2xl overflow-hidden border border-white/60"
      style={{
        transform: "translateX(-50%)",
        animation: "floatUp 0.22s cubic-bezier(0.16,1,0.3,1) both",
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.26), 0 4px 16px rgba(0,0,0,0.1)",
      }}
    >
      {/* Hero image */}
      <div className="relative overflow-hidden" style={{ height: project ? 130 : 110, background: heroBg }}>
        <img
          src={heroSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white text-sm flex items-center justify-center hover:bg-black/65 transition-colors z-10">
          ✕
        </button>

        {/* Project label */}
        {project && (
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-2">
            <p className="text-white text-xs font-bold drop-shadow leading-tight line-clamp-1">{project.title}</p>
            <p className="text-white/75 text-[9px]">📍 {project.location}</p>
          </div>
        )}

        {/* Contractor avatar */}
        <div className="absolute top-2.5 left-3 w-8 h-8 rounded-lg border-2 border-white shadow-md flex items-center justify-center text-white font-black text-xs"
          style={{ backgroundColor: c.avatar_color }}>
          {c.name.charAt(0)}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div>
            <p className="font-bold text-slate-800 text-sm leading-tight">{c.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{c.trade}</span>
              <span className="text-[9px] text-gray-400">📍 {c.location}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-0.5 justify-end">
              <span className="text-yellow-400 text-xs">★</span>
              <span className="text-xs font-bold text-slate-800">{c.rating_google.toFixed(1)}</span>
              <span className="text-[9px] text-gray-400 ml-0.5">({c.reviews_google})</span>
            </div>
            {c.verified && (
              <div className="flex items-center gap-0.5 justify-end mt-0.5">
                <span className="text-blue-500 text-xs">★</span>
                <span className="text-xs font-bold text-slate-800">{c.rating_tb.toFixed(1)}</span>
                <span className="text-[9px] text-gray-400 ml-0.5">TB</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-1 flex-wrap mb-2.5">
          {c.verified && <TrustBadge icon="✓" label="TB Verified" color="bg-blue-50 text-blue-700" />}
          {c.licensed && <TrustBadge icon="🏛" label="Licensed" color="bg-green-50 text-green-700" />}
          {c.insured && <TrustBadge icon="🛡" label="Insured" color="bg-emerald-50 text-emerald-700" />}
          {c.veteran_owned && <TrustBadge icon="🎖" label="Veteran" color="bg-amber-50 text-amber-700" />}
          {c.emergency && <TrustBadge icon="⚡" label="24/7" color="bg-red-50 text-red-600" />}
        </div>

        <p className="text-[11px] text-gray-500 line-clamp-2 mb-1 leading-relaxed">{c.description}</p>
        <p className="text-[10px] text-gray-400 mb-3">🕐 Responds {c.response_time} · {c.jobs_completed.toLocaleString("en-US")} jobs completed</p>

        <div className="flex gap-2">
          {project && (
            <Link href={`/project/${project.slug}`}
              className="flex-1 rounded-xl py-2 text-center text-xs font-bold border-2 text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors">
              View Project
            </Link>
          )}
          <Link href={`/pro/${c.slug}`}
            className={`${project ? "" : "flex-1 "}rounded-xl py-2 text-center text-xs font-bold border-2 text-slate-600 border-gray-200 hover:border-blue-200 hover:text-blue-700 transition-colors px-3`}>
            Profile
          </Link>
          <button className="flex-1 rounded-xl py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity shadow-sm" style={{ backgroundColor: "#1B3A6B" }}>
            Request Quote
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Filter Sheet ─────────────────────────────────────────────────────────────

function FilterSheet({
  open, onClose, verifiedOnly, setVerifiedOnly, licensedOnly, setLicensedOnly,
  insuredOnly, setInsuredOnly, emergencyOnly, setEmergencyOnly,
  veteranOnly, setVeteranOnly, minRating, setMinRating, onClear,
}: {
  open: boolean; onClose: () => void;
  verifiedOnly: boolean; setVerifiedOnly: (v: boolean) => void;
  licensedOnly: boolean; setLicensedOnly: (v: boolean) => void;
  insuredOnly: boolean; setInsuredOnly: (v: boolean) => void;
  emergencyOnly: boolean; setEmergencyOnly: (v: boolean) => void;
  veteranOnly: boolean; setVeteranOnly: (v: boolean) => void;
  minRating: number; setMinRating: (v: number) => void;
  onClear: () => void;
}) {
  if (!open) return null;
  const Toggle = ({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: () => void }) => (
    <label className="flex items-center justify-between py-3 border-b border-gray-100 cursor-pointer">
      <div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
      </div>
      <div onClick={onChange} className={`w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ${checked ? "bg-blue-600" : "bg-gray-200"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? "translate-x-4" : ""}`} />
      </div>
    </label>
  );
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl p-5 pb-8 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-base font-bold text-slate-800">Filters</p>
          <div className="flex items-center gap-3">
            <button onClick={onClear} className="text-sm font-semibold text-blue-600">Clear all</button>
            <button onClick={onClose} className="text-gray-400 text-xl leading-none">✕</button>
          </div>
        </div>
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Minimum Rating</p>
          <div className="flex gap-2">
            {[0, 4, 4.5, 4.8].map((r) => (
              <button key={r} onClick={() => setMinRating(r)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${minRating === r ? "border-blue-600 text-blue-600 bg-blue-50" : "border-gray-200 text-slate-600"}`}>
                {r === 0 ? "Any" : `${r}★`}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Trust & Credentials</p>
        <Toggle label="TradeBase Verified" sub="Background checked + reviewed by TB" checked={verifiedOnly} onChange={() => setVerifiedOnly(!verifiedOnly)} />
        <Toggle label="Licensed" sub="State contractor license on file" checked={licensedOnly} onChange={() => setLicensedOnly(!licensedOnly)} />
        <Toggle label="Insured" sub="General liability + workers comp" checked={insuredOnly} onChange={() => setInsuredOnly(!insuredOnly)} />
        <Toggle label="Veteran Owned" checked={veteranOnly} onChange={() => setVeteranOnly(!veteranOnly)} />
        <Toggle label="Emergency Service" sub="Available nights and weekends" checked={emergencyOnly} onChange={() => setEmergencyOnly(!emergencyOnly)} />
        <button onClick={onClose} className="mt-5 w-full rounded-xl py-3 text-sm font-bold text-white" style={{ backgroundColor: "#1B3A6B" }}>
          Show Results
        </button>
      </div>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FindContractorsClient({ liveContractors = [] }: { liveContractors?: Contractor[] }) {
  // Merge: live contractors first (real data), then mock fill-ins for the map demo.
  // Computed once — liveContractors only changes when the server sends different data.
  const liveIds = new Set(liveContractors.map((c) => c.id));
  const CONTRACTORS = [...liveContractors, ...MOCK_CONTRACTORS.filter((c) => !liveIds.has(c.id))];

  const [query, setQuery] = useState("");
  const [service, setService] = useState("All Services");
  const [city, setCity] = useState("");
  const [distance, setDistance] = useState("50");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [licensedOnly, setLicensedOnly] = useState(false);
  const [insuredOnly, setInsuredOnly] = useState(false);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [veteranOnly, setVeteranOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [sort, setSort] = useState("distance");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const activeFilterCount = [verifiedOnly, licensedOnly, insuredOnly, emergencyOnly, veteranOnly].filter(Boolean).length + (minRating > 0 ? 1 : 0);

  const filtered = useMemo(() => {
    let list = [...CONTRACTORS];
    const q = query.toLowerCase().trim();
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.trade.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.services.some((s) => s.toLowerCase().includes(q)));
    if (service !== "All Services") list = list.filter((c) => c.trade === service || c.services.some((s) => s.includes(service)));
    if (city) list = list.filter((c) => c.location.includes(city.split(",")[0]));
    const maxDist = Number(distance);
    if (maxDist < 50) list = list.filter((c) => c.distance <= maxDist);
    if (verifiedOnly) list = list.filter((c) => c.verified);
    if (licensedOnly) list = list.filter((c) => c.licensed);
    if (insuredOnly) list = list.filter((c) => c.insured);
    if (emergencyOnly) list = list.filter((c) => c.emergency);
    if (veteranOnly) list = list.filter((c) => c.veteran_owned);
    if (minRating > 0) list = list.filter((c) => c.rating_google >= minRating);
    if (sort === "distance") list.sort((a, b) => a.distance - b.distance);
    else if (sort === "rating") list.sort((a, b) => b.rating_google - a.rating_google);
    else if (sort === "reviews") list.sort((a, b) => b.reviews_google - a.reviews_google);
    else if (sort === "featured") list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CONTRACTORS, query, service, city, distance, verifiedOnly, licensedOnly, insuredOnly, emergencyOnly, veteranOnly, minRating, sort]);

  const selectedContractor = selectedPinId ? filtered.find((c) => c.id === selectedPinId) ?? null : null;
  const activeIds = new Set(filtered.map((c) => c.id));
  const visibleProjects = PROJECTS.filter((p) => activeIds.has(p.contractor_id));

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <Header />
      <SearchBar
        query={query} setQuery={setQuery}
        service={service} setService={setService}
        city={city} setCity={setCity}
        distance={distance} setDistance={setDistance}
        onSurpriseMe={() => { const r = SERVICES[Math.floor(Math.random() * (SERVICES.length - 1)) + 1]; setService(r); setQuery(""); }}
        onShowFilters={() => setShowFilters(true)}
        activeFilterCount={activeFilterCount}
      />

      {/* Mobile toggle */}
      <div className="md:hidden flex flex-shrink-0 border-b border-gray-100 bg-white">
        <button onClick={() => setMobileView("list")} className={`flex-1 py-2 text-sm font-semibold transition-colors ${mobileView === "list" ? "text-slate-800 border-b-2 border-slate-800" : "text-slate-400"}`}>
          📋 Results ({filtered.length})
        </button>
        <button onClick={() => setMobileView("map")} className={`flex-1 py-2 text-sm font-semibold transition-colors ${mobileView === "map" ? "text-slate-800 border-b-2 border-slate-800" : "text-slate-400"}`}>
          🗺️ Map
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* LEFT */}
        <div style={{ width: 400, flexShrink: 0, overflowY: "auto", overflowX: "hidden", background: "#f9fafb", borderRight: "1px solid #f0f0f0" }}>

          {visibleProjects.length > 0 && (
            <RecentProjectsCarousel
              projects={visibleProjects}
              onHoverContractor={(id) => setHoveredId(id)}
              onLeaveContractor={() => setHoveredId(null)}
              onSelectProject={(p) => {
                setSelectedPinId(p.contractor_id);
                setSelectedProject(p);
              }}
            />
          )}

          {filtered.length > 0 && <TrendingStatsRow contractors={filtered} />}

          {/* Sort bar */}
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100 bg-white flex-shrink-0 sticky top-0 z-10 shadow-sm">
            <p className="text-xs text-gray-500">
              <span className="font-bold text-slate-800">{filtered.length}</span> contractors found
            </p>
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none bg-white text-slate-700 font-medium">
              <option value="distance">Nearest first</option>
              <option value="rating">Highest rated</option>
              <option value="reviews">Most reviewed</option>
              <option value="featured">Featured first</option>
            </select>
          </div>

          {/* Cards */}
          <div style={{ padding: "12px" }}>
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm mt-4">
                <p className="text-2xl mb-2">🔍</p>
                <p className="font-bold text-slate-700 text-sm mb-1">No contractors found</p>
                <p className="text-xs text-gray-400 mb-3">Try broadening your search or filters.</p>
                <button onClick={() => { setQuery(""); setService("All Services"); setVerifiedOnly(false); setLicensedOnly(false); setInsuredOnly(false); setEmergencyOnly(false); setVeteranOnly(false); setMinRating(0); }}
                  className="text-xs font-semibold text-blue-600 hover:underline">Clear all filters</button>
              </div>
            ) : (
              filtered.map((c) => (
                <div key={c.id} style={{ marginBottom: 12 }}>
                  <ContractorCard
                    c={c}
                    hovered={hoveredId === c.id}
                    selected={selectedPinId === c.id}
                    onHover={() => setHoveredId(c.id)}
                    onLeave={() => setHoveredId(null)}
                    onSelect={() => setSelectedPinId((prev) => prev === c.id ? null : c.id)}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: map */}
        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
          <LeafletMap
            contractors={filtered}
            hoveredId={hoveredId}
            selectedId={selectedPinId}
            hasSelection={selectedPinId !== null}
            onSelect={(id) => {
              setSelectedPinId((prev) => prev === id ? null : id);
              setSelectedProject(null);
            }}
            onHover={setHoveredId}
          />

          {selectedContractor && (
            <MapFloatingCard
              contractor={selectedContractor}
              project={selectedProject}
              onClose={() => { setSelectedPinId(null); setSelectedProject(null); }}
            />
          )}

          {!selectedContractor && (
            <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm border border-gray-100">
              <p className="text-[10px] font-semibold text-slate-600">Click a pin to preview</p>
            </div>
          )}
        </div>
      </div>

      <FilterSheet
        open={showFilters} onClose={() => setShowFilters(false)}
        verifiedOnly={verifiedOnly} setVerifiedOnly={setVerifiedOnly}
        licensedOnly={licensedOnly} setLicensedOnly={setLicensedOnly}
        insuredOnly={insuredOnly} setInsuredOnly={setInsuredOnly}
        emergencyOnly={emergencyOnly} setEmergencyOnly={setEmergencyOnly}
        veteranOnly={veteranOnly} setVeteranOnly={setVeteranOnly}
        minRating={minRating} setMinRating={setMinRating}
        onClear={() => { setVerifiedOnly(false); setLicensedOnly(false); setInsuredOnly(false); setEmergencyOnly(false); setVeteranOnly(false); setMinRating(0); }}
      />
    </div>
  );
}
