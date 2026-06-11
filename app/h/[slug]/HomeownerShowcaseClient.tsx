"use client";

import { useState, useMemo } from "react";
import {
  MapPin, Star, DollarSign, Home, Shield, FileText,
  Share2, Check, Calendar, ChevronDown, ChevronUp, Wrench,
} from "lucide-react";

type Photo = { url: string; caption: string };
type Project = {
  id: string; title: string; contractor_name: string | null;
  description: string | null; cost: number | null; project_date: string | null;
  rating: number | null; review_text: string | null;
  has_warranty: boolean; photos: Photo[]; status: string;
};
type Property = {
  property_type: string | null; sq_footage: number | null; lot_size: string | null;
  year_built: number | null; bedrooms: number | null; bathrooms: number | null;
} | null;
type FutureProject = { id: string; title: string; status: string; notes: string | null };

type Props = {
  profile: {
    displayName: string; avatarUrl: string | null; bannerUrl: string | null;
    location: string | null; isPublic: boolean; memberSince: string | null; slug: string;
  };
  property: Property;
  projects: Project[];
  futureProjects: FutureProject[];
  stats: { projectCount: number; totalInvested: number; avgRating: number | null };
};

const TABS = ["Timeline", "Property", "Future"] as const;
type Tab = typeof TABS[number];

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  completed:   { label: "Completed",   color: "#16A34A", bg: "#DCFCE7" },
  in_progress: { label: "In Progress", color: "#D97706", bg: "#FEF3C7" },
};
const FUTURE_STATUS: Record<string, { label: string; color: string }> = {
  planning:     { label: "Planning",     color: "#6B7280" },
  researching:  { label: "Researching",  color: "#2563EB" },
  considering:  { label: "Considering",  color: "#D97706" },
};

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
function fmtMoney(n: number | null) {
  if (!n) return null;
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `$${n.toLocaleString()}`;
}
function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12} fill={i <= Math.round(rating) ? "#F59E0B" : "none"}
          stroke={i <= Math.round(rating) ? "#F59E0B" : "#D1D5DB"} />
      ))}
      <span className="ml-1 text-xs font-bold text-gray-700">{rating.toFixed(1)}</span>
    </span>
  );
}

function ShareButton({ name, slug }: { name: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  async function handle() {
    const url = `${window.location.origin}/h/${slug}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: `${name}'s Home Profile`, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-colors"
      style={{ backgroundColor: copied ? "#16A34A" : "rgba(255,255,255,0.22)", backdropFilter: "blur(4px)" }}>
      {copied ? <><Check size={11} /> Copied!</> : <><Share2 size={11} /> Share</>}
    </button>
  );
}

function ProjectCard({ p }: { p: Project }) {
  const [expanded, setExpanded] = useState(false);
  const ss = STATUS_STYLES[p.status] ?? STATUS_STYLES.completed;
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {p.photos.length > 0 && (
        <img src={p.photos[0].url} alt={p.title} className="w-full h-44 object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-gray-900 leading-snug flex-1">{p.title}</h3>
          <span className="text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0"
            style={{ color: ss.color, background: ss.bg }}>{ss.label}</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap mb-2">
          {p.contractor_name && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Wrench size={10} />{p.contractor_name}
            </span>
          )}
          {p.project_date && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar size={10} />{fmtDate(p.project_date)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {p.cost && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
              <DollarSign size={10} />{fmtMoney(p.cost)}
            </span>
          )}
          {p.rating && <StarRow rating={p.rating} />}
          {p.has_warranty && (
            <span className="flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              <Shield size={9} /> Warranty
            </span>
          )}
        </div>

        {p.description && (
          <div className="mt-3">
            <button onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600">
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? "Less" : "More details"}
            </button>
            {expanded && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{p.description}</p>}
          </div>
        )}
        {expanded && p.review_text && (
          <blockquote className="mt-2 border-l-2 border-amber-300 pl-3 text-sm text-gray-600 italic">
            "{p.review_text}"
          </blockquote>
        )}
      </div>
    </div>
  );
}

export default function HomeownerShowcaseClient({ profile, property, projects, futureProjects, stats }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Timeline");

  const initials = profile.displayName.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "HO";
  const allPhotos = useMemo(() => projects.flatMap(p => p.photos), [projects]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white shadow-sm">
        {/* Banner */}
        <div className="h-32 md:h-44 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1B3A6B 0%, #2d5ea3 100%)" }}>
          {profile.bannerUrl && (
            <img src={profile.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
          )}
          {!profile.bannerUrl && (
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=1200&h=300&fit=crop')", backgroundSize: "cover" }} />
          )}
          <div className="absolute -bottom-10 left-6">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.displayName}
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover bg-white" />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: "#1B3A6B" }}>{initials}</div>
            )}
          </div>
          <div className="absolute bottom-3 right-4 flex gap-2">
            <ShareButton name={profile.displayName} slug={profile.slug} />
          </div>
        </div>

        <div className="px-6 pt-12 pb-5">
          <h1 className="text-xl font-bold text-gray-900 mb-0.5">{profile.displayName}</h1>
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-5 flex-wrap">
            {profile.location && (
              <span className="flex items-center gap-1"><MapPin size={11} />{profile.location}</span>
            )}
            {property?.property_type && (
              <span className="flex items-center gap-1"><Home size={11} />{property.property_type}</span>
            )}
            {profile.memberSince && (
              <span className="flex items-center gap-1">
                <Calendar size={11} />Member since {new Date(profile.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{stats.projectCount}</p>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">Projects</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{stats.totalInvested > 0 ? fmtMoney(stats.totalInvested) : "—"}</p>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">Total Invested</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{stats.avgRating ? `${stats.avgRating.toFixed(1)} ★` : "—"}</p>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">Avg Rating Given</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-100 px-6">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === t ? "border-current" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                style={activeTab === t ? { borderColor: "#1B3A6B", color: "#1B3A6B" } : {}}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* TIMELINE */}
        {activeTab === "Timeline" && (
          projects.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
              <p className="text-5xl mb-3">🏠</p>
              <p className="font-semibold text-gray-700">No projects logged yet</p>
              <p className="text-sm text-gray-400 mt-1">Projects will appear here as they&apos;re added.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map(p => <ProjectCard key={p.id} p={p} />)}
            </div>
          )
        )}

        {/* PROPERTY */}
        {activeTab === "Property" && (
          <div className="space-y-4">
            {property ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1B3A6B" }}>
                    <Home size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{property.property_type ?? "Home"}</p>
                    {profile.location && <p className="text-xs text-gray-400">{profile.location}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Square Footage", value: property.sq_footage ? `${property.sq_footage.toLocaleString()} sq ft` : null },
                    { label: "Lot Size",        value: property.lot_size },
                    { label: "Year Built",      value: property.year_built ? String(property.year_built) : null },
                    { label: "Bedrooms",        value: property.bedrooms ? `${property.bedrooms} bed` : null },
                    { label: "Bathrooms",       value: property.bathrooms ? `${property.bathrooms} bath` : null },
                  ].filter(r => r.value).map(row => (
                    <div key={row.label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 mb-0.5">{row.label}</p>
                      <p className="text-sm font-bold text-gray-800">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <p className="text-5xl mb-3">🏡</p>
                <p className="font-semibold text-gray-700">Property details not set</p>
              </div>
            )}

            {/* Photos from projects */}
            {allPhotos.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Project Photos</p>
                <div className="columns-2 gap-2 space-y-2">
                  {allPhotos.map((ph, i) => (
                    <div key={i} className="break-inside-avoid rounded-xl overflow-hidden bg-gray-100">
                      <img src={ph.url} alt={ph.caption} className="w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FUTURE */}
        {activeTab === "Future" && (
          futureProjects.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
              <p className="text-5xl mb-3">🔮</p>
              <p className="font-semibold text-gray-700">No planned projects yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">On the horizon</p>
              {futureProjects.map(fp => {
                const st = FUTURE_STATUS[fp.status] ?? FUTURE_STATUS.planning;
                return (
                  <div key={fp.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 shrink-0 text-lg">🔧</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-gray-900 text-sm">{fp.title}</p>
                        <span className="text-[10px] font-bold" style={{ color: st.color }}>{st.label}</span>
                      </div>
                      {fp.notes && <p className="text-xs text-gray-500 leading-relaxed">{fp.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
