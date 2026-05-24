"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CONTRACTORS, SERVICES, CITIES, type Contractor } from "./mockData";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-2xl bg-gray-100 flex items-center justify-center">
      <p className="text-sm text-gray-400 animate-pulse">Loading map…</p>
    </div>
  ),
});

// ─── Stars ───────────────────────────────────────────────────────────────────

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "xs" }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const cls = size === "xs" ? "text-[10px]" : "text-xs";
  return (
    <span className={cls}>
      {"★".repeat(full)}
      {half ? "½" : ""}
      {"☆".repeat(5 - full - (half ? 1 : 0))}
    </span>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header() {
  return (
    <header style={{ backgroundColor: "#1B3A6B" }} className="sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-white font-bold text-lg tracking-tight">🏠 TradeBase</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/find-contractors" className="text-white text-sm font-semibold border-b-2 border-white pb-0.5">
            Find Contractors
          </Link>
          <Link href="/find-contractors" className="text-blue-200 text-sm font-medium hover:text-white transition-colors">
            Projects Near You
          </Link>
          <Link href="/auth/login" className="text-blue-200 text-sm font-medium hover:text-white transition-colors">
            For Contractors
          </Link>
        </nav>
        <Link
          href="/auth/signup"
          className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-xl text-white border-2 border-white/40 hover:bg-white/10 transition-colors"
        >
          Join TradeBase
        </Link>
      </div>
    </header>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────

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
  const selCls = "h-9 bg-white border border-gray-200 rounded-lg px-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 text-slate-700";
  return (
    <div className="bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
      <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What service do you need?"
            className="w-full h-9 rounded-lg border border-gray-200 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          />
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
        <button
          onClick={onShowFilters}
          className="h-9 flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-slate-700 bg-white hover:bg-gray-50 transition-colors relative flex-shrink-0"
        >
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
        <button
          onClick={onSurpriseMe}
          className="h-9 flex items-center gap-1 rounded-lg border border-purple-200 px-3 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors flex-shrink-0"
        >
          🎲 Surprise Me
        </button>
      </div>
    </div>
  );
}

// ─── Filter Sheet ─────────────────────────────────────────────────────────────

function FilterSheet({
  open, onClose,
  verifiedOnly, setVerifiedOnly,
  licensedOnly, setLicensedOnly,
  insuredOnly, setInsuredOnly,
  emergencyOnly, setEmergencyOnly,
  minRating, setMinRating,
  onClear,
}: {
  open: boolean; onClose: () => void;
  verifiedOnly: boolean; setVerifiedOnly: (v: boolean) => void;
  licensedOnly: boolean; setLicensedOnly: (v: boolean) => void;
  insuredOnly: boolean; setInsuredOnly: (v: boolean) => void;
  emergencyOnly: boolean; setEmergencyOnly: (v: boolean) => void;
  minRating: number; setMinRating: (v: number) => void;
  onClear: () => void;
}) {
  if (!open) return null;
  const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
    <label className="flex items-center justify-between py-3 border-b border-gray-100 cursor-pointer">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div
        onClick={onChange}
        className={`w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ${checked ? "bg-blue-600" : "bg-gray-200"}`}
      >
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

        <Toggle label="TradeBase Verified" checked={verifiedOnly} onChange={() => setVerifiedOnly(!verifiedOnly)} />
        <Toggle label="Licensed" checked={licensedOnly} onChange={() => setLicensedOnly(!licensedOnly)} />
        <Toggle label="Insured" checked={insuredOnly} onChange={() => setInsuredOnly(!insuredOnly)} />
        <Toggle label="Emergency Service Available" checked={emergencyOnly} onChange={() => setEmergencyOnly(!emergencyOnly)} />

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl py-3 text-sm font-bold text-white"
          style={{ backgroundColor: "#1B3A6B" }}
        >
          Show Results
        </button>
      </div>
    </>
  );
}

// ─── Contractor Card ─────────────────────────────────────────────────────────

function ContractorCard({
  c, hovered, onHover, onLeave,
}: {
  c: Contractor; hovered: boolean; onHover: () => void; onLeave: () => void;
}) {
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`bg-white rounded-2xl overflow-hidden shadow-sm border-2 transition-all duration-150 ${hovered ? "border-blue-400 shadow-md -translate-y-0.5" : "border-transparent"}`}
    >
      {/* Cover */}
      <div className={`relative h-36 bg-gradient-to-br ${c.cover_color} flex items-center justify-center`}>
        <span className="text-5xl opacity-20 select-none">{c.cover_emoji}</span>
        {c.featured && (
          <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400 text-yellow-900">
            ⭐ Featured
          </span>
        )}
        {c.emergency && (
          <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">
            🚨 24/7
          </span>
        )}
        {/* Logo avatar */}
        <div
          className="absolute -bottom-4 left-4 w-10 h-10 rounded-xl border-2 border-white shadow-md flex items-center justify-center text-white font-black text-sm"
          style={{ backgroundColor: c.avatar_color }}
        >
          {c.name.charAt(0)}
        </div>
      </div>

      {/* Body */}
      <div className="pt-6 px-4 pb-4">
        {/* Name + distance */}
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="font-bold text-slate-800 text-sm leading-snug">{c.name}</p>
          <span className="text-xs text-gray-400 flex-shrink-0">{c.distance} mi</span>
        </div>

        {/* Trade chip + location */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{c.trade}</span>
          <span className="text-xs text-gray-400">📍 {c.location}</span>
        </div>

        {/* Ratings row */}
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-xs font-bold text-slate-700">{c.rating_google.toFixed(1)}</span>
            <span className="text-[10px] text-gray-400">Google ({c.reviews_google})</span>
          </div>
          {c.verified && (
            <div className="flex items-center gap-1">
              <span className="text-[10px]">🔵</span>
              <span className="text-xs font-bold text-slate-700">{c.rating_tb.toFixed(1)}</span>
              <span className="text-[10px] text-gray-400">TB ({c.reviews_tb})</span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex gap-1 flex-wrap mb-2">
          {c.verified && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: "#EFF6FF", color: "#1B3A6B" }}>
              ✓ TB Verified
            </span>
          )}
          {c.licensed && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-green-50 text-green-700">
              🏛 Licensed
            </span>
          )}
          {c.insured && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
              🛡 Insured
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{c.description}</p>

        {/* Response time */}
        <p className="text-[10px] text-gray-400 mb-3">{c.response_time}</p>

        {/* Services pills */}
        <div className="flex flex-wrap gap-1 mb-3">
          {c.services.slice(0, 3).map((s) => (
            <span key={s} className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{s}</span>
          ))}
          {c.services.length > 3 && (
            <span className="text-[10px] text-gray-400">+{c.services.length - 3} more</span>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Link
            href={`/pro/${c.slug}`}
            className="flex-1 rounded-xl py-2 text-center text-xs font-bold border-2 text-slate-700 border-gray-200 hover:border-blue-200 hover:text-blue-700 transition-colors"
          >
            View Profile
          </Link>
          <button
            className="flex-1 rounded-xl py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1B3A6B" }}
          >
            Request Quote
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Sort Bar ─────────────────────────────────────────────────────────────────

function SortBar({ count, sort, setSort }: { count: number; sort: string; setSort: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-gray-500">
        <span className="font-bold text-slate-800">{count}</span> contractors found
      </p>
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none bg-white text-slate-700 font-medium"
      >
        <option value="distance">Nearest first</option>
        <option value="rating">Highest rated</option>
        <option value="reviews">Most reviewed</option>
        <option value="featured">Featured first</option>
      </select>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FindContractorsClient() {
  const [query, setQuery] = useState("");
  const [service, setService] = useState("All Services");
  const [city, setCity] = useState("");
  const [distance, setDistance] = useState("50");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [licensedOnly, setLicensedOnly] = useState(false);
  const [insuredOnly, setInsuredOnly] = useState(false);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [sort, setSort] = useState("distance");
  function handleSurpriseMe() {
    const randomService = SERVICES[Math.floor(Math.random() * (SERVICES.length - 1)) + 1];
    setService(randomService);
    setQuery("");
  }

  function clearFilters() {
    setVerifiedOnly(false);
    setLicensedOnly(false);
    setInsuredOnly(false);
    setEmergencyOnly(false);
    setMinRating(0);
  }

  const activeFilterCount = [verifiedOnly, licensedOnly, insuredOnly, emergencyOnly].filter(Boolean).length + (minRating > 0 ? 1 : 0);

  const filtered = useMemo(() => {
    let list = [...CONTRACTORS];
    const q = query.toLowerCase().trim();
    if (q) {
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.trade.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.services.some((s) => s.toLowerCase().includes(q))
      );
    }
    if (service !== "All Services") {
      list = list.filter((c) => c.trade === service || c.services.some((s) => s.includes(service)));
    }
    if (city) {
      list = list.filter((c) => c.location.includes(city.split(",")[0]));
    }
    const maxDist = Number(distance);
    if (maxDist < 50) {
      list = list.filter((c) => c.distance <= maxDist);
    }
    if (verifiedOnly) list = list.filter((c) => c.verified);
    if (licensedOnly) list = list.filter((c) => c.licensed);
    if (insuredOnly) list = list.filter((c) => c.insured);
    if (emergencyOnly) list = list.filter((c) => c.emergency);
    if (minRating > 0) list = list.filter((c) => c.rating_google >= minRating);

    // Sort
    if (sort === "distance") list.sort((a, b) => a.distance - b.distance);
    else if (sort === "rating") list.sort((a, b) => b.rating_google - a.rating_google);
    else if (sort === "reviews") list.sort((a, b) => b.reviews_google - a.reviews_google);
    else if (sort === "featured") list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

    return list;
  }, [query, service, city, distance, verifiedOnly, licensedOnly, insuredOnly, emergencyOnly, minRating, sort]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <Header />
      <SearchBar
        query={query} setQuery={setQuery}
        service={service} setService={setService}
        city={city} setCity={setCity}
        distance={distance} setDistance={setDistance}
        onSurpriseMe={handleSurpriseMe}
        onShowFilters={() => setShowFilters(true)}
        activeFilterCount={activeFilterCount}
      />

      {/* Mobile toggle bar */}
      <div className="md:hidden flex flex-shrink-0 border-b border-gray-100 bg-white">
        <button
          onClick={() => setMobileView("list")}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${mobileView === "list" ? "text-slate-800 border-b-2 border-slate-800" : "text-slate-400"}`}
        >
          📋 Results ({filtered.length})
        </button>
        <button
          onClick={() => setMobileView("map")}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${mobileView === "map" ? "text-slate-800 border-b-2 border-slate-800" : "text-slate-400"}`}
        >
          🗺️ Map
        </button>
      </div>

      {/* Body: fills all remaining height */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* LEFT: scrollable card list */}
        <div style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", overflowY: "auto", background: "#f9fafb", borderRight: "1px solid #f3f4f6", minHeight: 0 }}>
          <div className="px-3 py-2 flex items-center justify-between border-b border-gray-100 bg-white flex-shrink-0">
            <p className="text-xs text-gray-500">
              <span className="font-bold text-slate-800">{filtered.length}</span> contractors
            </p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none bg-white text-slate-700 font-medium"
            >
              <option value="distance">Nearest first</option>
              <option value="rating">Highest rated</option>
              <option value="reviews">Most reviewed</option>
              <option value="featured">Featured first</option>
            </select>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm mt-4">
                <p className="text-2xl mb-2">🔍</p>
                <p className="font-bold text-slate-700 text-sm mb-1">No contractors found</p>
                <p className="text-xs text-gray-400 mb-3">Try broadening your search or filters.</p>
                <button onClick={clearFilters} className="text-xs font-semibold text-blue-600 hover:underline">Clear all filters</button>
              </div>
            ) : (
              filtered.map((c) => (
                <ContractorCard
                  key={c.id}
                  c={c}
                  hovered={hoveredId === c.id}
                  onHover={() => { setHoveredId(c.id); setSelectedPinId(null); }}
                  onLeave={() => setHoveredId(null)}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT: map — always visible */}
        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
          <LeafletMap
            contractors={filtered}
            hoveredId={hoveredId}
            selectedId={selectedPinId}
            onSelect={(id) => setSelectedPinId((prev) => (prev === id ? null : id))}
            onHover={setHoveredId}
          />
        </div>
      </div>

      <FilterSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        verifiedOnly={verifiedOnly} setVerifiedOnly={setVerifiedOnly}
        licensedOnly={licensedOnly} setLicensedOnly={setLicensedOnly}
        insuredOnly={insuredOnly} setInsuredOnly={setInsuredOnly}
        emergencyOnly={emergencyOnly} setEmergencyOnly={setEmergencyOnly}
        minRating={minRating} setMinRating={setMinRating}
        onClear={clearFilters}
      />
    </div>
  );
}
