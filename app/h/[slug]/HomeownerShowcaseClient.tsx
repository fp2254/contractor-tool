"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin, Calendar, CheckCircle, Star, DollarSign, Clock,
  Shield, FileText, AlertTriangle, Home, Wrench, Zap, Wind,
  Share2, Check, ChevronRight, ExternalLink,
} from "lucide-react";

type Project = {
  id: string; title: string; contractor_name: string | null;
  description: string | null; review_text: string | null;
  cost: number | null; project_date: string | null; completed_date: string | null;
  rating: number | null; has_warranty: boolean; has_documentation: boolean;
  photos: string[]; status: string;
};
type Property = {
  property_type: string | null; sq_footage: number | null; lot_size: string | null;
  year_built: number | null; bedrooms: number | null; bathrooms: number | null; updated_at: string | null;
} | null;
type FutureProject = { id: string; title: string; status: string; cover_image_url: string | null; notes: string | null };
type ScorecardItem = { category: string; score_status: string };

type Props = {
  profile: {
    displayName: string; avatarUrl: string | null; bannerUrl: string | null;
    location: string | null; isPublic: boolean; memberSince: string | null; slug: string;
  };
  property: Property;
  projects: Project[];
  futureProjects: FutureProject[];
  scorecard: ScorecardItem[];
  stats: { projectCount: number; totalInvested: number; avgRating: number | null; contractorsWorked: number };
};

const TABS = ["Timeline", "Projects", "Photos", "Future Projects", "Property Details"] as const;
type Tab = typeof TABS[number];

const SCORECARD_ICONS: Record<string, typeof Home> = {
  Roof: Home, Plumbing: Wrench, Electrical: Zap, HVAC: Wind, Radon: Shield, Deck: Home,
};
const STATUS_COLORS: Record<string, { text: string; label: string }> = {
  excellent:       { text: "#16A34A", label: "Excellent" },
  good:            { text: "#16A34A", label: "Good" },
  fair:            { text: "#D97706", label: "Fair" },
  mitigated:       { text: "#16A34A", label: "Mitigated" },
  needs_attention: { text: "#D97706", label: "Needs Attention" },
  unknown:         { text: "#9CA3AF", label: "Unknown" },
};
const FUTURE_STATUS: Record<string, string> = {
  planning: "Planning", researching: "Researching", considering: "Considering",
};

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtMonth(d: string | null) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
function fmtMoney(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `$${n.toLocaleString()}`;
}

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size}
          fill={i <= Math.round(rating) ? "#F59E0B" : "none"}
          stroke={i <= Math.round(rating) ? "#F59E0B" : "#D1D5DB"} />
      ))}
    </span>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const r = 48, circ = 2 * Math.PI * r;
  const filled = circ * 0.75 * (score / 100);
  const color = score >= 80 ? "#16A34A" : score >= 60 ? "#D97706" : "#DC2626";
  const label = score >= 80 ? "Great" : score >= 60 ? "Fair" : "Needs Work";
  return (
    <div className="relative flex items-center justify-center" style={{ width: 130, height: 100 }}>
      <svg width={130} height={100} viewBox="0 0 130 100">
        <circle cx={65} cy={74} r={r} fill="none" stroke="#E5E7EB" strokeWidth={9}
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round"
          transform="rotate(-225 65 74)" />
        <circle cx={65} cy={74} r={r} fill="none" stroke={color} strokeWidth={9}
          strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
          transform="rotate(-225 65 74)" />
      </svg>
      <div className="absolute flex flex-col items-center" style={{ bottom: 4 }}>
        <span className="text-2xl font-bold text-gray-900">{score}</span>
        <span className="text-[10px] font-bold" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

function ShareButton({ name, slug }: { name: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  async function handle() {
    const url = `${window.location.origin}/h/${slug}`;
    if (navigator.share) { try { await navigator.share({ title: `${name}'s Home Profile`, url }); return; } catch {} }
    await navigator.clipboard.writeText(url);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm"
      style={{ backgroundColor: "#1B3A6B" }}>
      {copied ? <><Check size={12} /> Copied!</> : <><Share2 size={12} /> Share Profile</>}
    </button>
  );
}

export default function HomeownerShowcaseClient({ profile, property, projects, futureProjects, scorecard, stats }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Timeline");

  const initials = profile.displayName.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "HO";

  const scorecardScore = scorecard.length > 0 ? Math.round(
    scorecard.reduce((s, item) => {
      const val = { excellent: 100, good: 80, fair: 60, mitigated: 80, needs_attention: 40, unknown: 50 }[item.score_status] ?? 50;
      return s + val;
    }, 0) / scorecard.length
  ) : 0;

  // group projects by month
  type Group = { monthLabel: string; items: Project[] };
  const monthGroups: Group[] = [];
  for (const proj of projects) {
    const label = fmtMonth(proj.project_date ?? proj.completed_date ?? null);
    const last = monthGroups[monthGroups.length - 1];
    if (last && last.monthLabel === label) last.items.push(proj);
    else monthGroups.push({ monthLabel: label, items: [proj] });
  }

  // photos by category (from project titles as tags)
  const PHOTO_CATS = [
    { label: "Roof",        img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=150&fit=crop" },
    { label: "Kitchen",     img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=150&fit=crop" },
    { label: "Landscaping", img: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=150&fit=crop" },
    { label: "Exterior",    img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=200&h=150&fit=crop" },
    { label: "Basement",    img: "https://images.unsplash.com/photo-1565117447851-6cfa4b27c9a5?w=200&h=150&fit=crop" },
    { label: "Deck",        img: "https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?w=200&h=150&fit=crop" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top nav bar ── */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1B3A6B" }}>
            <Home size={14} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-base tracking-tight">TRADEBASE</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/auth/login" className="text-xs font-semibold text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
            Log In
          </Link>
          <Link href="/auth/signup" className="text-xs font-bold text-white px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#1B3A6B" }}>
            Sign Up
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="flex gap-5 items-start">
          {/* ── Center column ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Profile header */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {/* Banner */}
              <div className="relative h-56 overflow-hidden">
                {profile.bannerUrl ? (
                  <img src={profile.bannerUrl} alt="banner" className="w-full h-full object-cover" />
                ) : (
                  <img
                    src="https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&h=200&fit=crop"
                    alt="house"
                    className="w-full h-full object-cover opacity-80"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                {/* Avatar */}
                <div className="absolute -bottom-9 left-6">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.displayName}
                      className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-white"
                      style={{ backgroundColor: "#1B3A6B" }}>{initials}</div>
                  )}
                </div>
                <div className="absolute bottom-3 right-4 flex gap-2">
                  <ShareButton name={profile.displayName} slug={profile.slug} />
                </div>
              </div>

              {/* Info */}
              <div className="px-6 pt-11 pb-5">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-gray-900">{profile.displayName}</h1>
                  <CheckCircle size={18} fill="#1B3A6B" className="text-white" />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-5 flex-wrap">
                  {profile.location && <span className="flex items-center gap-1"><MapPin size={11} />{profile.location}</span>}
                  {property?.year_built && <span className="flex items-center gap-1"><Calendar size={11} />Built {property.year_built}</span>}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { value: stats.projectCount,                           label: "Completed Projects" },
                    { value: stats.totalInvested > 0 ? fmtMoney(stats.totalInvested) : "—", label: "Total Invested" },
                    { value: stats.avgRating ? `${stats.avgRating.toFixed(1)} ★` : "—",       label: "Average Rating" },
                    { value: stats.contractorsWorked,                      label: "Contractors Worked With" },
                  ].map(({ value, label }) => (
                    <div key={label} className="text-center">
                      <p className="text-lg font-bold text-gray-900">{value}</p>
                      <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="border-t border-gray-100 px-6">
                <div className="flex gap-1 -mb-px overflow-x-auto">
                  {TABS.map(t => (
                    <button key={t} onClick={() => setActiveTab(t)}
                      className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === t ? "" : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      style={activeTab === t ? { borderColor: "#1B3A6B", color: "#1B3A6B" } : {}}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── TIMELINE ── */}
            {activeTab === "Timeline" && (
              <div className="space-y-1">
                {projects.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                    <p className="text-4xl mb-3">🏠</p>
                    <p className="font-semibold text-gray-700">No projects logged yet</p>
                  </div>
                ) : monthGroups.map((group, gi) => (
                  <div key={gi} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#1B3A6B" }}>
                        <CheckCircle size={14} className="text-white" />
                      </div>
                      <span className="text-sm font-bold text-gray-700">{group.monthLabel}</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    <div className="divide-y divide-gray-50">
                      {group.items.map(proj => (
                        <div key={proj.id} className="px-5 py-4">
                          <div className="flex gap-4">
                            {/* Text on LEFT */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 mb-0.5 leading-snug">{proj.title}</h3>
                              {proj.contractor_name && (
                                <p className="text-xs text-gray-500 mb-1.5">
                                  by <span className="font-semibold" style={{ color: "#1B3A6B" }}>{proj.contractor_name}</span>
                                </p>
                              )}
                              {proj.rating != null && (
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <StarRating rating={proj.rating} />
                                  <span className="text-xs font-bold text-gray-700">{proj.rating.toFixed(1)}</span>
                                </div>
                              )}
                              {proj.description && (
                                <p className="text-xs text-gray-600 leading-relaxed mb-2 line-clamp-2">{proj.description}</p>
                              )}
                              <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">
                                {proj.cost != null && <span className="flex items-center gap-1"><DollarSign size={10} />${proj.cost.toLocaleString()}</span>}
                                {(proj.completed_date ?? proj.project_date) && (
                                  <span className="flex items-center gap-1">
                                    <Clock size={10} /> Completed {fmtDate(proj.completed_date ?? proj.project_date)}
                                  </span>
                                )}
                                {proj.has_warranty && <span className="flex items-center gap-1 text-green-600"><Shield size={10} /> Warranty</span>}
                                {proj.has_documentation && <span className="flex items-center gap-1 text-blue-600"><FileText size={10} /> Documentation</span>}
                              </div>
                            </div>
                            {/* Photo on RIGHT */}
                            {proj.photos.length > 0 && (
                              <div className="relative shrink-0">
                                <img src={proj.photos[0]} alt={proj.title} className="w-28 h-20 rounded-xl object-cover" />
                                {proj.photos.length > 1 && (
                                  <div className="absolute bottom-1 right-1 bg-black/60 rounded-md px-1.5 py-0.5 text-[9px] text-white font-bold">
                                    +{proj.photos.length - 1}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── PROJECTS ── */}
            {activeTab === "Projects" && (
              <div className="space-y-3">
                {projects.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                    <p className="text-4xl mb-3">🏗️</p>
                    <p className="font-semibold text-gray-700">No projects yet</p>
                  </div>
                ) : projects.map(proj => (
                  <div key={proj.id} className="bg-white rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900">{proj.title}</h3>
                        {proj.contractor_name && <p className="text-xs text-gray-500 mt-0.5">by {proj.contractor_name}</p>}
                      </div>
                      {proj.cost != null && (
                        <span className="text-sm font-bold text-green-700 bg-green-50 px-2 py-1 rounded-lg shrink-0 ml-3">
                          ${proj.cost.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {proj.rating != null && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <StarRating rating={proj.rating} />
                        <span className="text-xs font-bold text-gray-700">{proj.rating.toFixed(1)}</span>
                      </div>
                    )}
                    {proj.description && <p className="text-xs text-gray-600 leading-relaxed mb-3">{proj.description}</p>}
                    {proj.review_text && (
                      <blockquote className="border-l-2 border-amber-300 pl-3 text-xs text-gray-600 italic mb-3">
                        &ldquo;{proj.review_text}&rdquo;
                      </blockquote>
                    )}
                    {proj.photos.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {proj.photos.slice(0, 4).map((src, i) => (
                          <div key={i} className="relative">
                            <img src={src} alt="" className="w-20 h-16 rounded-lg object-cover" />
                            {i === 3 && proj.photos.length > 4 && (
                              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs font-bold">+{proj.photos.length - 4}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── PHOTOS ── */}
            {activeTab === "Photos" && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h2 className="font-bold text-gray-900 mb-4">Photo Gallery</h2>
                <div className="grid grid-cols-3 gap-2">
                  {PHOTO_CATS.map(cat => {
                    const catPhotos = projects
                      .filter(p => p.title.toLowerCase().includes(cat.label.toLowerCase()))
                      .flatMap(p => p.photos);
                    return (
                      <div key={cat.label} className="text-center">
                        <div className="rounded-xl overflow-hidden mb-1.5 aspect-video bg-gray-100">
                          <img src={catPhotos[0] ?? cat.img} alt={cat.label} className="w-full h-full object-cover" />
                        </div>
                        <p className="text-[11px] font-semibold text-gray-700">{cat.label}</p>
                        <p className="text-[10px] text-gray-400">{catPhotos.length} photos</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── FUTURE PROJECTS ── */}
            {activeTab === "Future Projects" && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="font-bold text-gray-900">Future Projects</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Projects this homeowner is planning or considering</p>
                </div>
                {futureProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-4xl mb-3">🔮</p>
                    <p className="font-semibold text-gray-700">No planned projects yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {futureProjects.map(p => (
                      <div key={p.id} className="text-center">
                        <div className="rounded-xl overflow-hidden mb-2 aspect-video bg-gray-100">
                          {p.cover_image_url
                            ? <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-2xl">🏗️</div>}
                        </div>
                        <p className="text-[11px] font-bold text-gray-800 mb-0.5">{p.title}</p>
                        <p className="text-[10px] text-gray-400 mb-2 capitalize">{FUTURE_STATUS[p.status] ?? p.status}</p>
                        <Link href={`/pro`}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg text-white block"
                          style={{ backgroundColor: "#1B3A6B" }}>
                          Get Estimates
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── PROPERTY DETAILS ── */}
            {activeTab === "Property Details" && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h2 className="font-bold text-gray-900 mb-4">Property Details</h2>
                {!property ? (
                  <div className="text-center py-8">
                    <p className="text-4xl mb-3">🏠</p>
                    <p className="font-semibold text-gray-700">No property details shared</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Property Type",       value: property.property_type },
                      { label: "Square Footage",       value: property.sq_footage ? `${property.sq_footage.toLocaleString()} sq ft` : null },
                      { label: "Lot Size",             value: property.lot_size },
                      { label: "Year Built",           value: property.year_built?.toString() },
                      { label: "Bedrooms / Bathrooms", value: property.bedrooms && property.bathrooms ? `${property.bedrooms} / ${property.bathrooms}` : null },
                    ].filter(r => r.value).map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                        <p className="text-sm font-semibold text-gray-800">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer stats bar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
                  {profile.memberSince && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-gray-400" />
                      Member Since: <span className="font-semibold text-gray-700 ml-1">{fmtDate(profile.memberSince.slice(0, 10))}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <CheckCircle size={12} className="text-gray-400" />
                    Projects: <span className="font-semibold text-gray-700 ml-1">{stats.projectCount}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <ExternalLink size={12} className="text-gray-400" />
                    Profile: <span className="font-semibold text-gray-700 ml-1">{profile.isPublic ? "Public" : "Private"}</span>
                  </span>
                </div>
                <ShareButton name={profile.displayName} slug={profile.slug} />
              </div>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="w-72 shrink-0 space-y-4">

            {/* Property Overview */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Property Overview</h3>
              {!property ? (
                <p className="text-xs text-gray-400 text-center py-3">No property details shared.</p>
              ) : (
                <div className="space-y-2.5">
                  {[
                    { label: "Property Type",        value: property.property_type },
                    { label: "Square Footage",        value: property.sq_footage ? `${property.sq_footage.toLocaleString()} sq ft` : null },
                    { label: "Lot Size",              value: property.lot_size },
                    { label: "Year Built",            value: property.year_built?.toString() },
                    { label: "Bedrooms / Bathrooms",  value: property.bedrooms && property.bathrooms ? `${property.bedrooms} / ${property.bathrooms}` : null },
                    { label: "Last Updated",          value: property.updated_at ? fmtDate(property.updated_at.slice(0, 10)) : null },
                  ].filter(r => r.value).map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-start">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-xs font-semibold text-gray-700 text-right max-w-[130px]">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Property Scorecard */}
            {scorecard.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Property Scorecard</h3>
                <div className="flex justify-center">
                  <ScoreGauge score={scorecardScore} />
                </div>
                <div className="space-y-2 mt-2">
                  {scorecard.map(({ category, score_status }) => {
                    const Icon = SCORECARD_ICONS[category] ?? Home;
                    const meta = STATUS_COLORS[score_status] ?? STATUS_COLORS.unknown;
                    const warn = score_status === "needs_attention";
                    return (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {warn
                            ? <AlertTriangle size={12} className="text-amber-500" />
                            : <CheckCircle size={12} style={{ color: meta.text }} />}
                          <span className="text-xs text-gray-600">{category}</span>
                        </div>
                        <span className="text-xs font-semibold" style={{ color: meta.text }}>{meta.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contractor Reviews (written by this homeowner) */}
            {projects.filter(p => p.rating && p.contractor_name).length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">Contractor Reviews</h3>
                  <ChevronRight size={14} className="text-gray-400" />
                </div>
                <div className="space-y-4">
                  {projects.filter(p => p.rating && p.contractor_name).slice(0, 2).map(p => (
                    <div key={p.id}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                          {(p.contractor_name ?? "?").slice(0, 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-700 truncate">{p.contractor_name}</p>
                          <div className="flex items-center gap-1">
                            <StarRating rating={p.rating!} size={10} />
                            <span className="text-[10px] text-gray-400 ml-1">{fmtMonth(p.project_date)}</span>
                          </div>
                        </div>
                      </div>
                      {(p.review_text ?? p.description) && (
                        <p className="text-xs text-gray-600 leading-relaxed italic line-clamp-3">
                          &ldquo;{p.review_text ?? p.description}&rdquo;
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">— {profile.displayName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA for contractors */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1B3A6B" }}>
                  <Wrench size={15} className="text-white" />
                </div>
                <h3 className="font-bold text-gray-900">Are you a contractor?</h3>
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                This homeowner may be looking for estimates. Create your profile to connect.
              </p>
              <Link href="/auth/signup"
                className="block w-full text-center rounded-xl py-2.5 text-xs font-bold text-white"
                style={{ backgroundColor: "#1B3A6B" }}>
                Get Started on TradeBase →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
