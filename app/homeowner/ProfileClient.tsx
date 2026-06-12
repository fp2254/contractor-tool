"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin, Calendar, CheckCircle, Star, DollarSign, Clock, Shield,
  FileText, Plus, ExternalLink, Edit3, AlertTriangle, Home, Wrench,
  Zap, Wind, TrendingUp, Award, Users, ChevronRight,
} from "lucide-react";

type Profile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  location: string | null;
  isVerified: boolean;
  isPublic: boolean;
  memberSince: string | null;
};

type Property = {
  property_type: string | null;
  sq_footage: number | null;
  lot_size: string | null;
  year_built: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  updated_at: string | null;
} | null;

type Project = {
  id: string;
  title: string;
  contractor_name: string | null;
  description: string | null;
  review_text: string | null;
  cost: number | null;
  project_date: string | null;
  completed_date: string | null;
  rating: number | null;
  has_warranty: boolean;
  has_documentation: boolean;
  photos: string[];
  status: string;
};

type FutureProject = {
  id: string;
  title: string;
  status: string;
  cover_image_url: string | null;
};

type ScorecardItem = {
  category: string;
  score_status: string;
};

// ── Demo / placeholder data shown when no real data exists yet ─────────────
const DEMO_PROJECTS: Project[] = [
  {
    id: "demo-1",
    title: "New Roof Installation",
    contractor_name: "Horizon Roofing",
    description: "Complete roof tear-off and installation of GAF Timberline HDZ shingles.",
    cost: 12400,
    project_date: "2026-06-14",
    completed_date: "2026-06-14",
    rating: 5,
    review_text: "Frank showed up on time, explained everything clearly, and did excellent work. Highly recommend!",
    has_warranty: true,
    has_documentation: false,
    photos: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&h=90&fit=crop",
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=120&h=90&fit=crop",
    ],
    status: "completed",
  },
  {
    id: "demo-2",
    title: "Kitchen Remodel",
    contractor_name: "Oak & Stone Builders",
    description: "Complete kitchen renovation including cabinets, countertops, flooring, and lighting.",
    cost: 38300,
    project_date: "2026-03-28",
    completed_date: "2026-03-28",
    rating: 4.9,
    review_text: "Great communication, finished on time, and the work looks amazing. Crew was professional and respectful.",
    has_warranty: false,
    has_documentation: true,
    photos: [
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=120&h=90&fit=crop",
    ],
    status: "completed",
  },
];

const DEMO_FUTURE: FutureProject[] = [
  { id: "f1", title: "New Deck", status: "planning", cover_image_url: "https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?w=160&h=110&fit=crop" },
  { id: "f2", title: "Bathroom Remodel", status: "researching", cover_image_url: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=160&h=110&fit=crop" },
  { id: "f3", title: "Fence Installation", status: "planning", cover_image_url: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=160&h=110&fit=crop" },
];

const DEMO_SCORECARD: ScorecardItem[] = [
  { category: "Roof", score_status: "excellent" },
  { category: "Plumbing", score_status: "good" },
  { category: "Electrical", score_status: "good" },
  { category: "HVAC", score_status: "good" },
  { category: "Radon", score_status: "mitigated" },
  { category: "Deck", score_status: "needs_attention" },
];

const SCORECARD_ICONS: Record<string, typeof Home> = {
  Roof: Home, Plumbing: Wrench, Electrical: Zap, HVAC: Wind,
  Radon: Shield, Deck: Home,
};

const STATUS_COLORS: Record<string, { text: string; bg: string; label: string }> = {
  excellent:       { text: "#16A34A", bg: "bg-green-100",  label: "Excellent" },
  good:            { text: "#16A34A", bg: "bg-green-100",  label: "Good" },
  fair:            { text: "#D97706", bg: "bg-amber-100",  label: "Fair" },
  needs_attention: { text: "#D97706", bg: "bg-amber-100",  label: "Needs Attention" },
  mitigated:       { text: "#16A34A", bg: "bg-green-100",  label: "Mitigated" },
  unknown:         { text: "#9CA3AF", bg: "bg-gray-100",   label: "Unknown" },
};

const TABS = ["Timeline", "Projects", "Photos", "Reviews", "Documents", "Property Details"] as const;
type Tab = typeof TABS[number];

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} fill={i <= Math.round(rating) ? "#F59E0B" : "none"} stroke={i <= Math.round(rating) ? "#F59E0B" : "#D1D5DB"} />
      ))}
    </span>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const r = 48, circ = 2 * Math.PI * r;
  const filled = circ * 0.75 * (score / 100);
  return (
    <div className="relative flex items-center justify-center" style={{ width: 130, height: 100 }}>
      <svg width={130} height={100} viewBox="0 0 130 100">
        <circle cx={65} cy={74} r={r} fill="none" stroke="#E5E7EB" strokeWidth={9}
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round"
          transform="rotate(-225 65 74)" />
        <circle cx={65} cy={74} r={r} fill="none" stroke="#16A34A" strokeWidth={9}
          strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
          transform="rotate(-225 65 74)" />
      </svg>
      <div className="absolute flex flex-col items-center" style={{ bottom: 4 }}>
        <span className="text-2xl font-bold text-gray-900">{score}</span>
        <span className="text-[10px] font-bold text-green-600">Great</span>
      </div>
    </div>
  );
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMonth(d: string | null) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function ProfileClient({
  profile,
  property,
  projects: realProjects,
  futureProjects: realFuture,
  scorecard: realScorecard,
}: {
  profile: Profile;
  property: Property;
  projects: Project[];
  futureProjects: FutureProject[];
  scorecard: ScorecardItem[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Timeline");

  // Use demo data when user has no real data yet
  const projects     = realProjects.length > 0     ? realProjects     : DEMO_PROJECTS;
  const futureProj   = realFuture.length > 0        ? realFuture       : DEMO_FUTURE;
  const scorecard    = realScorecard.length > 0     ? realScorecard    : DEMO_SCORECARD;
  const isDemo       = realProjects.length === 0;

  const totalInvested = projects.reduce((s, p) => s + (p.cost ?? 0), 0);
  const avgRating     = projects.filter(p => p.rating).reduce((s, p, _, a) => s + (p.rating ?? 0) / a.length, 0);
  const scorecardScore = Math.round(
    scorecard.reduce((s, item) => {
      const val = { excellent: 100, good: 80, fair: 60, mitigated: 80, needs_attention: 40, unknown: 50 }[item.score_status] ?? 50;
      return s + val;
    }, 0) / Math.max(scorecard.length, 1)
  );

  return (
    <div className="flex gap-4 p-4 min-h-full">
      {/* Center column */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Demo banner */}
        {isDemo && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 flex items-center gap-3">
            <span className="text-lg">👋</span>
            <div>
              <p className="text-sm font-semibold text-blue-800">Welcome! Your profile is ready.</p>
              <p className="text-xs text-blue-600">The timeline below is sample data. Add your first project to get started.</p>
            </div>
            <Link href="/homeowner/projects/new" className="ml-auto shrink-0 text-xs font-bold text-white px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#1B3A6B" }}>
              + Add Project
            </Link>
          </div>
        )}

        {/* Profile header card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {/* Banner */}
          <div className="relative h-56 bg-gradient-to-br from-slate-600 to-slate-800 overflow-hidden">
            <img
              src={profile.bannerUrl || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=400&fit=crop"}
              alt="banner"
              className="w-full h-full object-cover"
            />
            {/* Avatar */}
            <div className="absolute -bottom-8 left-6">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="avatar" className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: "#1B3A6B" }}>
                  {profile.displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            {/* Action buttons */}
            <div className="absolute bottom-3 right-4 flex gap-2">
              <Link href="/homeowner/settings" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
                <Edit3 size={12} /> Edit Profile
              </Link>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm" style={{ backgroundColor: "#1B3A6B" }}>
                <ExternalLink size={12} /> Share Profile
              </button>
            </div>
          </div>

          {/* Profile info */}
          <div className="px-6 pt-10 pb-5">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{profile.displayName}</h1>
              {profile.isVerified && <CheckCircle size={18} fill="#1B3A6B" className="text-white" />}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-5">
              {profile.location && <span className="flex items-center gap-1"><MapPin size={11} /> {profile.location}</span>}
              {property?.year_built && <span className="flex items-center gap-1"><Calendar size={11} /> Built {property.year_built}</span>}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{projects.length}</p>
                <p className="text-[10px] text-gray-500 leading-tight">Completed Projects</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">${(totalInvested / 1000).toFixed(0)}k</p>
                <p className="text-[10px] text-gray-500 leading-tight">Total Invested</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{avgRating > 0 ? avgRating.toFixed(1) + " ★" : "—"}</p>
                <p className="text-[10px] text-gray-500 leading-tight">Average Rating</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {new Set(projects.map(p => p.contractor_name).filter(Boolean)).size}
                </p>
                <p className="text-[10px] text-gray-500 leading-tight">Contractors Worked With</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-gray-100 px-6">
            <div className="flex gap-1 -mb-px overflow-x-auto">
              {TABS.map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === t ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                  style={activeTab === t ? { borderColor: "#1B3A6B", color: "#1B3A6B" } : {}}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "Timeline" && (
          <div className="space-y-1">
            {/* Group projects by month */}
            {(() => {
              type Group = { monthLabel: string; items: Project[] };
              const groups: Group[] = [];
              for (const proj of projects) {
                const label = fmtMonth(proj.project_date ?? proj.completed_date ?? null);
                const last = groups[groups.length - 1];
                if (last && last.monthLabel === label) last.items.push(proj);
                else groups.push({ monthLabel: label, items: [proj] });
              }
              return groups.map((group, gi) => (
                <div key={gi} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Month header row */}
                  <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#1B3A6B" }}>
                      <CheckCircle size={14} className="text-white" />
                    </div>
                    <span className="text-sm font-bold text-gray-700">{group.monthLabel}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  {/* Projects in this month */}
                  <div className="divide-y divide-gray-50">
                    {group.items.map(proj => (
                      <div key={proj.id} className="px-5 py-4">
                        <div className="flex gap-4">
                          {/* Photo thumbnail or placeholder */}
                          {proj.photos && (proj.photos as string[]).length > 0 ? (
                            <div className="relative shrink-0">
                              <img src={(proj.photos as string[])[0]} alt={proj.title}
                                className="w-28 h-20 rounded-xl object-cover" />
                              {(proj.photos as string[]).length > 1 && (
                                <div className="absolute bottom-1 right-1 bg-black/60 rounded-md px-1.5 py-0.5 text-[9px] text-white font-bold">
                                  +{(proj.photos as string[]).length - 1}
                                </div>
                              )}
                            </div>
                          ) : null}

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
                              {proj.cost != null && (
                                <span className="flex items-center gap-1">
                                  <DollarSign size={10} />${proj.cost.toLocaleString()}
                                </span>
                              )}
                              {(proj.completed_date ?? proj.project_date) && (
                                <span className="flex items-center gap-1">
                                  <Clock size={10} /> Completed {fmtDate(proj.completed_date ?? proj.project_date)}
                                </span>
                              )}
                              {proj.has_warranty && (
                                <span className="flex items-center gap-1 text-green-600"><Shield size={10} /> Warranty</span>
                              )}
                              {proj.has_documentation && (
                                <span className="flex items-center gap-1 text-blue-600"><FileText size={10} /> Documentation</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
            {projects.length > 0 && (
              <div className="text-center pt-2">
                <Link href="/homeowner/projects" className="text-xs font-semibold text-blue-600 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-50 inline-block">
                  View All Projects
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === "Projects" && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <p className="text-3xl mb-2">🏗️</p>
            <p className="font-semibold text-gray-700">Projects list coming soon</p>
            <p className="text-xs text-gray-400 mt-1">Switch to the Timeline tab to see your project history.</p>
          </div>
        )}

        {activeTab === "Photos" && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Roof",        count: 0, img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=150&fit=crop" },
                { label: "Kitchen",     count: 0, img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=150&fit=crop" },
                { label: "Exterior",    count: 0, img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=200&h=150&fit=crop" },
                { label: "Landscaping", count: 0, img: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=150&fit=crop" },
                { label: "Basement",    count: 0, img: "https://images.unsplash.com/photo-1565117447851-6cfa4b27c9a5?w=200&h=150&fit=crop" },
                { label: "Deck",        count: 0, img: "https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?w=200&h=150&fit=crop" },
              ].map(cat => (
                <div key={cat.label} className="text-center">
                  <div className="rounded-xl overflow-hidden mb-1.5 aspect-video cursor-pointer hover:opacity-90 transition">
                    <img src={cat.img} alt={cat.label} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[11px] font-semibold text-gray-700">{cat.label}</p>
                  <p className="text-[10px] text-gray-400">{cat.count} photos</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeTab === "Reviews" || activeTab === "Documents") && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <p className="text-3xl mb-2">{activeTab === "Reviews" ? "⭐" : "📄"}</p>
            <p className="font-semibold text-gray-700">{activeTab} coming soon</p>
          </div>
        )}

        {activeTab === "Property Details" && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Property Details</h3>
              <Link href="/homeowner/property" className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                <Edit3 size={11} /> Edit
              </Link>
            </div>
            {!property ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">🏠</p>
                <p className="font-semibold text-gray-700 mb-1">No property details yet</p>
                <p className="text-xs text-gray-400 mb-4">Add your property info to get better contractor matches.</p>
                <Link href="/homeowner/property" className="text-xs font-bold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: "#1B3A6B" }}>
                  Add Property Details
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Property Type",         value: property.property_type },
                  { label: "Square Footage",         value: property.sq_footage ? `${property.sq_footage.toLocaleString()} sq ft` : null },
                  { label: "Lot Size",               value: property.lot_size },
                  { label: "Year Built",             value: property.year_built?.toString() },
                  { label: "Bedrooms / Bathrooms",   value: property.bedrooms && property.bathrooms ? `${property.bedrooms} / ${property.bathrooms}` : null },
                ].map(({ label, value }) => value ? (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-gray-800">{value}</p>
                  </div>
                ) : null)}
              </div>
            )}
          </div>
        )}

        {/* Photo Gallery (always shown below tabs) */}
        {activeTab === "Timeline" && (
          <>
            {/* Future Projects */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-bold text-gray-900">Future Projects</h2>
                <Link href="/homeowner/future" className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                  <Plus size={12} /> Add Future Project
                </Link>
              </div>
              <p className="text-xs text-gray-400 mb-4">Projects you&apos;re planning or considering.</p>
              {futureProj.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                  <p className="text-3xl mb-2">🚧</p>
                  <p className="text-sm font-medium text-gray-600">No future projects yet</p>
                  <Link href="/homeowner/future/new" className="mt-3 inline-block text-xs font-bold text-white px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#1B3A6B" }}>
                    Add Your First
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {futureProj.map(p => (
                    <div key={p.id} className="text-center">
                      <div className="rounded-xl overflow-hidden mb-2 aspect-video">
                        {p.cover_image_url
                          ? <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-2xl">🏗️</div>
                        }
                      </div>
                      <p className="text-[11px] font-bold text-gray-800 mb-0.5">{p.title}</p>
                      <p className="text-[10px] text-gray-400 mb-2 capitalize">{p.status}</p>
                      <button className="text-[10px] font-bold px-2 py-1 rounded-lg text-white w-full" style={{ backgroundColor: "#1B3A6B" }}>
                        Get Estimates
                      </button>
                    </div>
                  ))}
                  <div className="text-center flex flex-col items-center justify-center">
                    <Link href="/homeowner/future/new" className="w-full aspect-video rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-blue-300 transition-colors block">
                      <Plus size={20} className="text-gray-300" />
                    </Link>
                    <p className="text-[11px] text-gray-400 mt-1">Add Project</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer stats */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                  {[
                    { icon: Calendar, label: "Member Since", value: profile.memberSince ? fmtDate(profile.memberSince) : "Today" },
                    { icon: Clock,    label: "Last Active",  value: "Today" },
                    { icon: Users,    label: "Connections",  value: `${new Set(projects.map(p => p.contractor_name).filter(Boolean)).size} Contractors` },
                    { icon: TrendingUp, label: "Profile Views", value: "—" },
                    { icon: Award,    label: "Projects Shared", value: profile.isPublic ? "Public" : "Private" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Icon size={12} className="text-gray-400" />
                      <span>{label}: <span className="font-semibold text-gray-700">{value}</span></span>
                    </div>
                  ))}
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">
                  <ExternalLink size={11} /> Share Your Profile
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right sidebar */}
      <div className="w-72 shrink-0 space-y-4">
        {/* Property Overview */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Property Overview</h3>
          {!property ? (
            <div className="text-center py-4">
              <p className="text-xs text-gray-400 mb-3">No property details yet.</p>
              <Link href="/homeowner/property" className="text-xs font-bold text-white px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#1B3A6B" }}>
                Add Property
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-2.5">
                {[
                  { label: "Property Type",       value: property.property_type },
                  { label: "Square Footage",       value: property.sq_footage ? `${property.sq_footage.toLocaleString()} sq ft` : null },
                  { label: "Lot Size",             value: property.lot_size },
                  { label: "Year Built",           value: property.year_built?.toString() },
                  { label: "Bedrooms / Bathrooms", value: property.bedrooms && property.bathrooms ? `${property.bedrooms} / ${property.bathrooms}` : null },
                  { label: "Last Updated",         value: property.updated_at ? fmtDate(property.updated_at.slice(0, 10)) : null },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-start">
                    <span className="text-xs text-gray-400">{label}</span>
                    <span className="text-xs font-semibold text-gray-700 text-right max-w-[130px]">{value}</span>
                  </div>
                ))}
              </div>
              <Link href="/homeowner/property" className="mt-4 block w-full border border-gray-200 rounded-xl py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 text-center">
                Edit Property Details
              </Link>
            </>
          )}
        </div>

        {/* Property Scorecard */}
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
          {scorecard.length === 0 && (
            <div className="text-center py-4 mt-2">
              <p className="text-xs text-gray-400">Complete your property profile to generate a scorecard.</p>
            </div>
          )}
        </div>

        {/* Contractor Reviews */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Contractor Reviews</h3>
            <Link href="/homeowner/reviews" className="text-xs text-blue-600 font-semibold">See all</Link>
          </div>
          {projects.filter(p => p.rating && p.contractor_name).length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-gray-400">Reviews you write for contractors will appear here.</p>
            </div>
          ) : (
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
          )}
        </div>

        {/* Contractor Feedback */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Contractor Feedback</h3>
            <Link href="/homeowner/reviews" className="text-xs text-blue-600 font-semibold">See all</Link>
          </div>
          {isDemo ? (
            <div className="space-y-4">
              {[
                { name: "Oak & Stone Builders", date: "Mar 2026", text: "Wonderful clients! Clear vision, great communication, and timely payments. Would love to work with them again." },
                { name: "Horizon Roofing",      date: "Jun 2026", text: "Home was well prepared and accessible. Great experience all around." },
              ].map(fb => (
                <div key={fb.name}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold" style={{ color: "#1B3A6B" }}>
                      {fb.name.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-700 truncate">{fb.name}</p>
                      <p className="text-[10px] text-gray-400">Contractor Review · {fb.date}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed italic line-clamp-3">
                    &ldquo;{fb.text}&rdquo;
                  </p>
                </div>
              ))}
              <p className="text-[10px] text-gray-300 text-center pt-1">Sample data — reviews from your contractors will appear here</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-gray-400">Feedback from contractors you&apos;ve worked with will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
