"use client";

import { useState } from "react";
import {
  MapPin, CheckCircle, Star, DollarSign, Clock, Shield, FileText,
  Home, Wrench, Zap, Wind, AlertTriangle, ChevronRight,
  Briefcase, Users, Award, TrendingUp, ExternalLink,
} from "lucide-react";

type Project = {
  id: string;
  title: string;
  contractor_name: string | null;
  description: string | null;
  cost: number | null;
  project_date: string | null;
  completed_date: string | null;
  rating: number | null;
  has_warranty: boolean;
  has_documentation: boolean;
  photos: string[];
  status: string;
};

type Props = {
  contractor: {
    name: string;
    slug: string;
    trade: string;
    location: string;
    photo_url: string | null;
    tagline?: string;
    years_experience?: number;
    license_text?: string;
    jobs_completed?: number;
    avg_rating?: number;
    review_count?: number;
  };
  stats: {
    projectCount: number;
    totalInvested: number;
    avgRating: number | null;
  };
  projects: Project[];
};

const TABS = ["Timeline", "Projects", "Photos", "Reviews"] as const;
type Tab = typeof TABS[number];

const SCORECARD_ICONS: Record<string, typeof Home> = {
  Roofing: Home, Plumbing: Wrench, Electrical: Zap, HVAC: Wind,
  Radon: Shield, Decks: Home, Carpentry: Wrench, Painting: Home,
};

const STATUS_COLORS: Record<string, { text: string; bg: string; label: string }> = {
  excellent:       { text: "#16A34A", bg: "bg-green-100",  label: "Excellent" },
  good:            { text: "#16A34A", bg: "bg-green-100",  label: "Good" },
  fair:            { text: "#D97706", bg: "bg-amber-100",  label: "Fair" },
  needs_attention: { text: "#D97706", bg: "bg-amber-100",  label: "Needs Attention" },
  mitigated:       { text: "#16A34A", bg: "bg-green-100",  label: "Mitigated" },
  unknown:         { text: "#9CA3AF", bg: "bg-gray-100",   label: "Unknown" },
};

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMonth(d: string | null) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

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
  const color = score >= 80 ? "#16A34A" : score >= 60 ? "#D97706" : "#DC2626";
  const label = score >= 80 ? "Great" : score >= 60 ? "Fair" : "Poor";
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

export default function ShowcaseClient({ contractor, stats, projects }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Timeline");

  const totalInvested = projects.reduce((s, p) => s + (p.cost ?? 0), 0);
  const ratedProjects = projects.filter(p => p.rating);
  const avgRating = ratedProjects.length > 0
    ? ratedProjects.reduce((s, p) => s + (p.rating ?? 0), 0) / ratedProjects.length
    : null;
  const uniqueAreas = new Set(projects.map(p => p.contractor_name).filter(Boolean)).size;

  // Build a simple trade scorecard from project types
  const tradeScores = Array.from(
    new Set(projects.map(p => guessTrade(p.title)).filter(Boolean))
  ).slice(0, 6).map(trade => ({
    category: trade,
    score_status: "good" as const,
  }));

  const scorecardScore = tradeScores.length > 0 ? Math.min(70 + tradeScores.length * 5, 99) : 0;

  return (
    <div className="flex gap-4 p-4 min-h-full">
      {/* ── Left sidebar ── */}
      <div className="w-56 shrink-0 hidden lg:block">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-3">
          {contractor.photo_url ? (
            <img src={contractor.photo_url} alt={contractor.name}
              className="w-full h-32 object-cover" />
          ) : (
            <div className="w-full h-32 flex items-center justify-center text-4xl font-black text-white"
              style={{ backgroundColor: "#1B3A6B" }}>
              {contractor.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="p-4">
            <p className="text-sm font-bold text-gray-900 leading-tight">{contractor.name}</p>
            {contractor.trade && <p className="text-xs text-blue-600 font-semibold mt-0.5">{contractor.trade}</p>}
            {contractor.location && (
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                <MapPin size={10} />{contractor.location}
              </p>
            )}
          </div>
        </div>

        {/* Nav */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
          {[
            { icon: Briefcase, label: "Projects", count: stats.projectCount },
            { icon: Star, label: "Reviews", count: ratedProjects.length },
            { icon: Award, label: "About" },
          ].map(({ icon: Icon, label, count }) => (
            <button key={label}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
              <Icon size={15} className="text-gray-400" />
              <span className="text-sm text-gray-700 flex-1">{label}</span>
              {count !== undefined && count > 0 && (
                <span className="text-[11px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{count}</span>
              )}
              <ChevronRight size={13} className="text-gray-300" />
            </button>
          ))}
        </div>

        {/* Get Quote CTA */}
        <a href={`/pro/${contractor.slug}`}
          className="block w-full text-center rounded-2xl py-3 text-sm font-bold text-white shadow-sm"
          style={{ backgroundColor: "#1B3A6B" }}>
          Get a Free Quote →
        </a>
      </div>

      {/* ── Main column ── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Profile header card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {/* Banner */}
          <div className="relative h-36 bg-gradient-to-br from-slate-700 to-slate-900 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&h=200&fit=crop"
              alt="banner"
              className="w-full h-full object-cover opacity-70"
            />
            {/* Avatar */}
            <div className="absolute -bottom-8 left-6">
              {contractor.photo_url ? (
                <img src={contractor.photo_url} alt={contractor.name}
                  className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: "#1B3A6B" }}>
                  {contractor.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            {/* Action button */}
            <div className="absolute bottom-3 right-4">
              <a href={`/pro/${contractor.slug}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm"
                style={{ backgroundColor: "#1B3A6B" }}>
                <ExternalLink size={12} /> View Full Profile
              </a>
            </div>
          </div>

          {/* Info */}
          <div className="px-6 pt-10 pb-5">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{contractor.name}</h1>
              <CheckCircle size={18} fill="#1B3A6B" className="text-white" />
            </div>
            {contractor.trade && <p className="text-sm font-semibold text-blue-600 mb-1">{contractor.trade}</p>}
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-5">
              {contractor.location && <span className="flex items-center gap-1"><MapPin size={11} />{contractor.location}</span>}
              {avgRating && (
                <span className="flex items-center gap-1">
                  <StarRating rating={avgRating} size={11} />
                  <span className="font-semibold">{avgRating.toFixed(1)}</span>
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{stats.projectCount}</p>
                <p className="text-[10px] text-gray-500 leading-tight">Completed Projects</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {totalInvested > 0 ? `$${(totalInvested / 1000).toFixed(0)}k` : "—"}
                </p>
                <p className="text-[10px] text-gray-500 leading-tight">Total Project Value</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{avgRating ? `${avgRating.toFixed(1)} ★` : "—"}</p>
                <p className="text-[10px] text-gray-500 leading-tight">Average Rating</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{ratedProjects.length}</p>
                <p className="text-[10px] text-gray-500 leading-tight">Client Reviews</p>
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

        {/* ── Tab content ── */}
        {activeTab === "Timeline" && (
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <p className="text-5xl mb-3">🏗️</p>
                <p className="font-semibold text-gray-700 mb-1">Portfolio coming soon</p>
                <p className="text-xs text-gray-400">Projects are being added — check back soon.</p>
              </div>
            ) : (
              projects.map((proj, idx) => (
                <div key={proj.id} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center gap-1 shrink-0 w-16">
                      <p className="text-[10px] font-bold text-gray-400 uppercase text-center leading-tight">
                        {fmtMonth(proj.project_date ?? proj.completed_date)}
                      </p>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#1B3A6B" }}>
                        <CheckCircle size={14} className="text-white" />
                      </div>
                      {idx < projects.length - 1 && (
                        <div className="w-0.5 bg-gray-200 flex-1 mt-1" style={{ minHeight: 20 }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 mb-0.5">{proj.title}</h3>
                      {proj.rating && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <StarRating rating={proj.rating} />
                          <span className="text-xs font-bold text-gray-700">{proj.rating.toFixed(1)}</span>
                        </div>
                      )}
                      {proj.description && (
                        <p className="text-xs text-gray-600 leading-relaxed mb-3">{proj.description}</p>
                      )}
                      {proj.photos && (proj.photos as string[]).length > 0 && (
                        <div className="flex gap-1.5 mb-3 flex-wrap">
                          {(proj.photos as string[]).slice(0, 3).map((src, i) => (
                            <div key={i} className="relative">
                              <img src={src} alt="" className="w-20 h-16 rounded-lg object-cover" />
                              {i === 2 && (proj.photos as string[]).length > 3 && (
                                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">+{(proj.photos as string[]).length - 3}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">
                        {proj.cost && <span className="flex items-center gap-1"><DollarSign size={10} />${proj.cost.toLocaleString()}</span>}
                        {(proj.completed_date || proj.project_date) && (
                          <span className="flex items-center gap-1"><Clock size={10} />Completed {fmtDate(proj.completed_date ?? proj.project_date)}</span>
                        )}
                        {proj.has_warranty && <span className="flex items-center gap-1 text-green-600"><Shield size={10} />Warranty</span>}
                        {proj.has_documentation && <span className="flex items-center gap-1 text-blue-600"><FileText size={10} />Documentation</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "Projects" && (
          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <p className="text-3xl mb-2">🏗️</p>
                <p className="font-semibold text-gray-700">No projects yet</p>
              </div>
            ) : (
              projects.map(proj => (
                <div key={proj.id} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{proj.title}</h3>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${proj.status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {proj.status === "completed" ? "Completed" : "In Progress"}
                    </span>
                  </div>
                  {proj.rating && <div className="mb-2"><StarRating rating={proj.rating} /></div>}
                  {proj.description && <p className="text-xs text-gray-500 leading-relaxed mb-2 line-clamp-2">{proj.description}</p>}
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">
                    {proj.cost && <span className="flex items-center gap-1"><DollarSign size={10} />${proj.cost.toLocaleString()}</span>}
                    {(proj.completed_date || proj.project_date) && <span className="flex items-center gap-1"><Clock size={10} />{fmtDate(proj.completed_date ?? proj.project_date)}</span>}
                    {proj.has_warranty && <span className="flex items-center gap-1 text-green-600"><Shield size={10} />Warranty</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "Photos" && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            {projects.some(p => (p.photos as string[]).length > 0) ? (
              <div className="grid grid-cols-3 gap-2">
                {projects.flatMap(p => (p.photos as string[]).map((src, i) => ({ src, title: p.title, i }))).slice(0, 12).map(({ src, title }, idx) => (
                  <div key={idx} className="rounded-xl overflow-hidden aspect-video">
                    <img src={src} alt={title} className="w-full h-full object-cover hover:opacity-90 transition" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-3xl mb-2">📷</p>
                <p className="font-semibold text-gray-700">No photos yet</p>
                <p className="text-xs text-gray-400 mt-1">Project photos will appear here</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "Reviews" && (
          <div className="space-y-3">
            {ratedProjects.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <p className="text-3xl mb-2">⭐</p>
                <p className="font-semibold text-gray-700">No reviews yet</p>
                <p className="text-xs text-gray-400 mt-1">Client ratings will appear here</p>
              </div>
            ) : (
              ratedProjects.map(p => (
                <div key={p.id} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
                      {p.title.slice(0, 1)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{p.title}</p>
                      <div className="flex items-center gap-1.5">
                        <StarRating rating={p.rating!} size={11} />
                        <span className="text-xs font-bold text-gray-600">{p.rating!.toFixed(1)}</span>
                      </div>
                    </div>
                    <span className="ml-auto text-[11px] text-gray-400">{fmtDate(p.completed_date ?? p.project_date)}</span>
                  </div>
                  {p.description && <p className="text-xs text-gray-600 leading-relaxed italic">&ldquo;{p.description}&rdquo;</p>}
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              {[
                { icon: Briefcase, label: "Projects", value: stats.projectCount.toString() },
                { icon: DollarSign, label: "Total Value", value: totalInvested > 0 ? `$${(totalInvested / 1000).toFixed(0)}k` : "—" },
                { icon: Star, label: "Reviews", value: ratedProjects.length.toString() },
                { icon: Award, label: "Profile", value: "Public" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Icon size={12} className="text-gray-400" />
                  <span>{label}: <span className="font-semibold text-gray-700">{value}</span></span>
                </div>
              ))}
            </div>
            <a href={`/pro/${contractor.slug}`}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">
              <ExternalLink size={11} /> View Full Profile
            </a>
          </div>
        </div>
      </div>

      {/* ── Right sidebar ── */}
      <div className="w-72 shrink-0 hidden xl:block space-y-4">
        {/* Business Overview */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Business Overview</h3>
          <div className="space-y-2.5">
            {[
              { label: "Trade / Specialty", value: contractor.trade || null },
              { label: "Service Area", value: contractor.location || null },
              { label: "Years Experience", value: contractor.years_experience ? `${contractor.years_experience} years` : null },
              { label: "Jobs Completed", value: contractor.jobs_completed ? contractor.jobs_completed.toLocaleString() : (stats.projectCount > 0 ? stats.projectCount.toString() : null) },
              { label: "Portfolio Projects", value: stats.projectCount > 0 ? stats.projectCount.toString() : null },
            ].filter(r => r.value).map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs font-semibold text-gray-700 text-right max-w-[130px]">{value}</span>
              </div>
            ))}
          </div>
          <a href={`/pro/${contractor.slug}`}
            className="mt-4 block w-full border border-gray-200 rounded-xl py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 text-center">
            View Full Profile
          </a>
        </div>

        {/* Trade Scorecard */}
        {tradeScores.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Work Scorecard</h3>
            <div className="flex justify-center">
              <ScoreGauge score={scorecardScore} />
            </div>
            <div className="space-y-2 mt-2">
              {tradeScores.map(({ category, score_status }) => {
                const meta = STATUS_COLORS[score_status] ?? STATUS_COLORS.unknown;
                return (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle size={12} style={{ color: meta.text }} />
                      <span className="text-xs text-gray-600">{category}</span>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: meta.text }}>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Client Reviews */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Client Reviews</h3>
            {ratedProjects.length > 2 && (
              <button onClick={() => setActiveTab("Reviews")} className="text-xs text-blue-600 font-semibold">See all</button>
            )}
          </div>
          {ratedProjects.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-gray-400">Client reviews will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ratedProjects.slice(0, 2).map(p => (
                <div key={p.id}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                      {p.title.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-700 truncate">{p.title}</p>
                      <StarRating rating={p.rating!} size={10} />
                    </div>
                  </div>
                  {p.description && (
                    <p className="text-xs text-gray-600 leading-relaxed italic line-clamp-2">&ldquo;{p.description}&rdquo;</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Get Quote CTA */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-2">Ready to get started?</h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Get a free quote from {contractor.name} for your next project.
          </p>
          <a href={`/pro/${contractor.slug}`}
            className="block w-full text-center rounded-xl py-2.5 text-xs font-bold text-white"
            style={{ backgroundColor: "#1B3A6B" }}>
            Get My Free Quote →
          </a>
        </div>
      </div>
    </div>
  );
}

function guessTrade(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("roof")) return "Roofing";
  if (t.includes("kitchen")) return "Kitchen Remodel";
  if (t.includes("bathroom")) return "Bathroom Remodel";
  if (t.includes("plumb") || t.includes("pipe") || t.includes("water")) return "Plumbing";
  if (t.includes("electric") || t.includes("panel") || t.includes("wiring")) return "Electrical";
  if (t.includes("hvac") || t.includes("heat") || t.includes("cool") || t.includes("ac")) return "HVAC";
  if (t.includes("deck") || t.includes("patio")) return "Decks & Patios";
  if (t.includes("paint")) return "Painting";
  if (t.includes("floor")) return "Flooring";
  if (t.includes("landscap") || t.includes("lawn")) return "Landscaping";
  if (t.includes("fence")) return "Fencing";
  if (t.includes("radon")) return "Radon Mitigation";
  if (t.includes("window") || t.includes("door")) return "Windows & Doors";
  return "";
}
