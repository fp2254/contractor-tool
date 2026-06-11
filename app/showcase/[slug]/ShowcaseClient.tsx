"use client";

import { useState, useMemo } from "react";
import {
  MapPin, CheckCircle, Star, DollarSign,
  Home, Wrench, Zap, Wind, Shield,
  Briefcase, ChevronRight, ExternalLink, Camera, Tag,
} from "lucide-react";

type Project = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  location: string | null;
  completed_at: string | null;
  photos: { url: string; caption: string }[];
  tags: string[];
  cost: number | null;
};

type Props = {
  profile: {
    name: string;
    slug: string;
    trade: string;
    location: string;
    photo_url: string | null;
    tagline?: string;
    years_experience?: number | null;
    license_text?: string | null;
    is_published: boolean;
  };
  stats: {
    projectCount: number;
    totalInvested: number;
  };
  projects: Project[];
};

const TABS = ["Timeline", "Projects", "Photos"] as const;
type Tab = typeof TABS[number];

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function fmtMoney(n: number | null) {
  if (!n) return null;
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `$${n.toLocaleString()}`;
}

function groupByMonth(projects: Project[]) {
  const groups: { label: string; items: Project[] }[] = [];
  const seen = new Map<string, Project[]>();
  for (const p of projects) {
    const key = p.completed_at
      ? new Date(p.completed_at + "T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : "In Progress";
    if (!seen.has(key)) { seen.set(key, []); groups.push({ label: key, items: seen.get(key)! }); }
    seen.get(key)!.push(p);
  }
  return groups;
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  completed:   { label: "Completed",   color: "#16A34A", bg: "#DCFCE7" },
  in_progress: { label: "In Progress", color: "#D97706", bg: "#FEF3C7" },
};

export default function ShowcaseClient({ profile, stats, projects }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Timeline");

  const allPhotos = useMemo(() =>
    projects.flatMap(p => p.photos.map(ph => ({ ...ph, project: p.title }))),
    [projects]
  );

  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    projects.forEach(p => p.tags.forEach(t => m.set(t, (m.get(t) ?? 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [projects]);

  const months = useMemo(() => groupByMonth(projects), [projects]);

  const initials = profile.name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Profile header ── */}
      <div className="bg-white shadow-sm">
        {/* Banner */}
        <div className="h-32 md:h-44 bg-gradient-to-br from-[#1B3A6B] to-[#0f2347] relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&h=300&fit=crop')", backgroundSize: "cover", backgroundPosition: "center" }} />
          <div className="absolute -bottom-10 left-6">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={profile.name}
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover bg-white" />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: "#1B3A6B" }}>
                {initials}
              </div>
            )}
          </div>
          <div className="absolute bottom-3 right-4 flex gap-2">
            <a href={`/pro/${profile.slug}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
              <ExternalLink size={11} /> Business Page
            </a>
          </div>
        </div>

        <div className="px-6 pt-12 pb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
                {profile.is_published && <CheckCircle size={17} fill="#1B3A6B" className="text-white shrink-0" />}
              </div>
              {profile.trade && <p className="text-sm font-semibold text-blue-600 mb-1">{profile.trade}</p>}
              {profile.tagline && <p className="text-sm text-gray-500 mb-1">{profile.tagline}</p>}
              {profile.location && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin size={11} />{profile.location}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{stats.projectCount}</p>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">Completed Projects</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-900">
                {stats.totalInvested > 0 ? fmtMoney(stats.totalInvested) : "—"}
              </p>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">Total Project Value</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{allPhotos.length}</p>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">Project Photos</p>
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
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">

        {/* TIMELINE */}
        {activeTab === "Timeline" && (
          projects.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
              <p className="text-5xl mb-3">🏗️</p>
              <p className="font-semibold text-gray-700 mb-1">Portfolio coming soon</p>
              <p className="text-sm text-gray-400">Projects will appear here as they&apos;re added.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {months.map(({ label, items }) => (
                <div key={label}>
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="space-y-4">
                    {items.map(p => {
                      const ss = STATUS_STYLES[p.status] ?? STATUS_STYLES.completed;
                      return (
                        <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                          {/* Photos strip */}
                          {p.photos.length > 0 && (
                            <div className="relative">
                              <div className="flex gap-1 overflow-x-auto">
                                {p.photos.slice(0, 4).map((ph, i) => (
                                  <div key={i}
                                    className={`shrink-0 bg-gray-100 overflow-hidden ${i === 0 ? "w-full h-52" : "w-24 h-24"}`}
                                    style={i === 0 ? {} : { display: "none" }}>
                                    <img src={ph.url} alt={ph.caption || p.title}
                                      className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                              {p.photos.length > 1 && (
                                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                  <Camera size={9} /> {p.photos.length} photos
                                </div>
                              )}
                            </div>
                          )}
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-bold text-gray-900 leading-snug flex-1">{p.title}</h3>
                              <span className="text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0"
                                style={{ color: ss.color, background: ss.bg }}>
                                {ss.label}
                              </span>
                            </div>
                            {p.location && (
                              <p className="text-xs text-gray-400 flex items-center gap-1 mb-1.5">
                                <MapPin size={10} />{p.location}
                              </p>
                            )}
                            {p.description && (
                              <p className="text-sm text-gray-600 leading-relaxed mb-3">{p.description}</p>
                            )}
                            <div className="flex items-center gap-3 flex-wrap">
                              {p.cost && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                                  <DollarSign size={10} />{fmtMoney(p.cost)}
                                </span>
                              )}
                              {p.tags.map((tag, i) => (
                                <span key={i} className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                  <Tag size={9} />{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* PROJECTS GRID */}
        {activeTab === "Projects" && (
          projects.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
              <p className="text-5xl mb-3">📁</p>
              <p className="font-semibold text-gray-700">No projects yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Tags filter row */}
              {tagCounts.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {tagCounts.map(([tag, count]) => (
                    <span key={tag} className="shrink-0 text-xs font-semibold bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 shadow-sm">
                      {tag} <span className="text-gray-400">({count})</span>
                    </span>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {projects.map(p => {
                  const ss = STATUS_STYLES[p.status] ?? STATUS_STYLES.completed;
                  return (
                    <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      {p.photos[0] ? (
                        <img src={p.photos[0].url} alt={p.title} className="w-full h-36 object-cover" />
                      ) : (
                        <div className="w-full h-36 flex items-center justify-center text-4xl bg-gray-50">🏗️</div>
                      )}
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <p className="text-sm font-bold text-gray-900 leading-snug flex-1">{p.title}</p>
                          <span className="text-[9px] font-bold rounded-full px-2 py-0.5 shrink-0"
                            style={{ color: ss.color, background: ss.bg }}>{ss.label}</span>
                        </div>
                        {p.location && <p className="text-[11px] text-gray-400 mb-1">{p.location}</p>}
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          {p.cost && <span className="text-[10px] font-bold text-green-700">{fmtMoney(p.cost)}</span>}
                          {p.completed_at && <span className="text-[10px] text-gray-400">{fmtDate(p.completed_at)}</span>}
                        </div>
                        {p.tags.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {p.tags.slice(0, 3).map((t, i) => (
                              <span key={i} className="text-[9px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* PHOTOS */}
        {activeTab === "Photos" && (
          allPhotos.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
              <p className="text-5xl mb-3">📷</p>
              <p className="font-semibold text-gray-700">No photos yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-400 font-semibold">{allPhotos.length} photos across {projects.filter(p => p.photos.length > 0).length} projects</p>
              <div className="columns-2 sm:columns-3 gap-2 space-y-2">
                {allPhotos.map((ph, i) => (
                  <div key={i} className="break-inside-avoid rounded-xl overflow-hidden bg-gray-100">
                    <img src={ph.url} alt={ph.caption || ph.project}
                      className="w-full object-cover" />
                    {ph.caption && (
                      <p className="text-[10px] text-gray-500 px-2 py-1 truncate">{ph.caption}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* CTA */}
        {profile.is_published && (
          <div className="bg-[#1B3A6B] rounded-2xl p-5 text-center shadow-sm">
            <p className="text-white font-bold mb-1">Work with {profile.name.split(" ")[0]}</p>
            <p className="text-blue-200 text-xs mb-4">Get a free quote for your next project</p>
            <a href={`/pro/${profile.slug}`}
              className="inline-block bg-white text-[#1B3A6B] font-bold text-sm px-6 py-2.5 rounded-xl shadow-sm">
              Get a Free Quote →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
