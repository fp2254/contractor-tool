"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  MapPin, CheckCircle, DollarSign,
  Briefcase, ExternalLink, Camera, Tag, Share2, Check,
  ArrowLeftRight, Clock, Pencil, Trash2, X, Star, Gamepad2, Award, Zap
} from "lucide-react";

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
  isOwner?: boolean;
};

const TABS = ["TIMELINE", "MISSIONS", "INTEL"] as const;
type Tab = typeof TABS[number];

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
}

function fmtMoney(n: number | null) {
  if (!n) return null;
  if (n >= 1000) return `$\${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `$\${n.toLocaleString()}`;
}

function groupByMonth(projects: Project[]) {
  const groups: { label: string; items: Project[] }[] = [];
  const seen = new Map<string, Project[]>();
  for (const p of projects) {
    const key = p.completed_at
      ? new Date(p.completed_at + "T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()
      : "IN PROGRESS";
    if (!seen.has(key)) { seen.set(key, []); groups.push({ label: key, items: seen.get(key)! }); }
    seen.get(key)!.push(p);
  }
  return groups;
}

/** Detect "before" photo index from captions, fall back to first photo */
function detectBeforeAfter(photos: Photo[]): { before: Photo; after: Photo } | null {
  if (photos.length < 2) return null;
  const bIdx = photos.findIndex(p => /\\bbefore\\b/i.test(p.caption));
  const aIdx = photos.findIndex(p => /\\bafter\\b/i.test(p.caption));
  if (bIdx !== -1 && aIdx !== -1 && bIdx !== aIdx) {
    return { before: photos[bIdx], after: photos[aIdx] };
  }
  return { before: photos[0], after: photos[photos.length - 1] };
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  completed:   { label: "COMPLETED",   color: "#000", bg: "#4ADE80" },
  in_progress: { label: "IN PROGRESS", color: "#000", bg: "#FDE047" },
};

// ── Before/After slider component ──────────────────────────────────────────
function BeforeAfterSlider({ before, after }: { before: Photo; after: Photo }) {
  const [pos, setPos] = useState(50); // percent
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    update(e.clientX);
    const onMove = (ev: MouseEvent) => { if (dragging.current) update(ev.clientX); };
    const onUp = () => { dragging.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    dragging.current = true;
    update(e.touches[0].clientX);
    const onMove = (ev: TouchEvent) => { if (dragging.current) update(ev.touches[0].clientX); };
    const onEnd = () => { dragging.current = false; window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd); };
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
  };

  return (
    <div ref={containerRef} className="relative w-full select-none overflow-hidden rounded-t-[14px] border-b-[4px] border-black" style={{ height: 220 }}
      onMouseDown={onMouseDown} onTouchStart={onTouchStart}>
      {/* After (bottom, full width) */}
      <img src={after.url} alt="After" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      {/* Before (top, clipped) */}
      <div className="absolute inset-0 overflow-hidden border-r-[4px] border-black" style={{ width: `\${pos}%` }}>
        <img src={before.url} alt="Before" className="absolute inset-0 w-full h-full object-cover" style={{ width: containerRef.current ? `\${containerRef.current.offsetWidth}px` : "100%" }} draggable={false} />
      </div>
      {/* Divider line / Handle */}
      <div className="absolute top-0 bottom-0 w-1 bg-yellow-400" style={{ left: `\${pos}%`, transform: "translateX(-50%)" }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-yellow-400 border-[3px] border-black shadow-[3px_3px_0_0_#000] flex items-center justify-center cursor-ew-resize">
          <ArrowLeftRight size={18} className="text-black font-black" />
        </div>
      </div>
      {/* Labels */}
      <div className="absolute bottom-3 left-3 text-[10px] font-black text-black bg-yellow-400 border-[2px] border-black shadow-[2px_2px_0_0_#000] px-3 py-1 uppercase tracking-widest">BEFORE</div>
      <div className="absolute bottom-3 right-3 text-[10px] font-black text-white bg-black border-[2px] border-black shadow-[2px_2px_0_0_#000] px-3 py-1 uppercase tracking-widest">AFTER</div>
    </div>
  );
}

// ── Share button ────────────────────────────────────────────────────────────
function ShareButton({ name, slug }: { name: string; slug: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `\${window.location.origin}/showcase/\${slug}`;
    const text = `Check out \${name}'s project portfolio on TradeBase`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: text, url });
        return;
      } catch {
        // user cancelled or not supported
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-black bg-cyan-300 border-[3px] border-black shadow-[3px_3px_0_0_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[2px_2px_0_0_#000] active:translate-y-[3px] active:translate-x-[3px] active:shadow-none transition-all">
      {copied ? <><Check size={14} /> Copied!</> : <><Share2 size={14} /> Share</>}
    </button>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ShowcaseClient({ profile, stats, projects: initialProjects, isOwner = false }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("TIMELINE");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [managing, setManaging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Remove this project from your showcase?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/projects/api/\${id}`, { method: "DELETE" });
      if (res.ok) setProjects(ps => ps.filter(p => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  const allPhotos = useMemo(() =>
    projects.flatMap(p => p.photos.map(ph => ({ ...ph, project: p.title }))),
    [projects]
  );

  const bannerUrl = useMemo(() => allPhotos[0]?.url ?? null, [allPhotos]);

  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    projects.forEach(p => p.tags.forEach(t => m.set(t, (m.get(t) ?? 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [projects]);

  const months = useMemo(() => groupByMonth(projects), [projects]);

  const initials = profile.name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-pink-400 selection:text-black">
      {/* ── Profile header ── */}
      <div className="bg-white border-b-[4px] border-black shadow-[0_8px_0_0_rgba(0,0,0,1)] relative z-10">
        {/* Banner */}
        <div className="h-64 bg-black relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 opacity-80" />
          {bannerUrl && (
            <img src={bannerUrl} alt="banner" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60 grayscale" />
          )}
          
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
             <div className="w-[120%] h-[120%] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8cGF0aCBkPSJNMCAwbDhfOFpNOCAwTDBfOHoiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')]"></div>
          </div>

          {isOwner && (
            <a href="/app/more"
              className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-black bg-white border-[3px] border-black shadow-[3px_3px_0_0_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[2px_2px_0_0_#000] transition-all z-20">
              ← BACK TO HQ
            </a>
          )}
          
          <div className="absolute -bottom-12 left-6 z-20">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={profile.name}
                className="w-24 h-24 rounded-2xl border-[4px] border-black shadow-[4px_4px_0_0_#000] object-cover bg-white transform -rotate-3" />
            ) : (
              <div className="w-24 h-24 rounded-2xl border-[4px] border-black shadow-[4px_4px_0_0_#000] flex items-center justify-center text-3xl font-black text-black bg-yellow-400 transform -rotate-3">
                {initials}
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="absolute bottom-4 right-4 flex gap-3 z-20">
            {isOwner && (
              <button
                onClick={() => setManaging(m => !m)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-black border-[3px] border-black shadow-[3px_3px_0_0_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[2px_2px_0_0_#000] active:translate-y-[3px] active:translate-x-[3px] active:shadow-none transition-all"
                style={{
                  backgroundColor: managing ? "#EF4444" : "#FDE047",
                  color: managing ? "#FFF" : "#000",
                }}>
                {managing ? <><X size={14} /> DONE</> : <><Pencil size={14} /> MANAGE</>}
              </button>
            )}
            <ShareButton name={profile.name} slug={profile.slug} />
            <a href={`/pro/\${profile.slug}`}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-black border-[3px] border-black shadow-[3px_3px_0_0_#FDE047] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[2px_2px_0_0_#FDE047] active:translate-y-[3px] active:translate-x-[3px] active:shadow-none transition-all">
              <ExternalLink size={14} /> HQ
            </a>
          </div>
        </div>

        <div className="px-6 pt-16 pb-6 relative">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black text-black uppercase tracking-tight">{profile.name}</h1>
                {profile.is_published && <Award size={28} className="text-yellow-400 fill-yellow-400 filter drop-shadow-[2px_2px_0_rgba(0,0,0,1)] shrink-0" />}
              </div>
              {profile.trade && <p className="text-sm font-black uppercase tracking-widest text-pink-500 mb-2">{profile.trade}</p>}
              {profile.tagline && <p className="text-base font-bold text-gray-700 mb-2">{profile.tagline}</p>}
              {profile.location && (
                <p className="text-xs font-black uppercase tracking-widest text-black flex items-center gap-1.5 bg-gray-100 border-[2px] border-black px-3 py-1.5 rounded-lg w-fit shadow-[2px_2px_0_0_#000]">
                  <MapPin size={12} />{profile.location}
                </p>
              )}
            </div>
            
            {/* Stats Block */}
            <div className="flex gap-4 shrink-0 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
              <div className="bg-yellow-100 border-[3px] border-black rounded-xl p-3 min-w-[100px] text-center shadow-[4px_4px_0_0_#000]">
                <p className="text-3xl font-black text-black">{stats.projectCount}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-black mt-1">MISSIONS</p>
              </div>
              <div className="bg-cyan-100 border-[3px] border-black rounded-xl p-3 min-w-[100px] text-center shadow-[4px_4px_0_0_#000]">
                <p className="text-3xl font-black text-black">
                  {stats.totalInvested > 0 ? fmtMoney(stats.totalInvested) : "—"}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-black mt-1">VALUE SECURED</p>
              </div>
              <div className="bg-pink-100 border-[3px] border-black rounded-xl p-3 min-w-[100px] text-center shadow-[4px_4px_0_0_#000]">
                <p className="text-3xl font-black text-black">{allPhotos.length}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-black mt-1">INTEL FILES</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 bg-gray-100 border-t-[4px] border-black py-4">
          <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0">
            {TABS.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest border-[3px] border-black transition-all whitespace-nowrap \${
                  activeTab === t 
                    ? "bg-lime-400 text-black shadow-[4px_4px_0_0_#000] translate-y-[-2px]" 
                    : "bg-white text-gray-500 hover:bg-gray-50 hover:shadow-[2px_2px_0_0_#000] shadow-[0_0_0_0_#000]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 relative z-0">
        
        {/* TIMELINE */}
        {activeTab === "TIMELINE" && (
          projects.length === 0 ? (
            <div className="bg-white border-[4px] border-black rounded-3xl p-12 shadow-[8px_8px_0_0_#000] text-center max-w-2xl mx-auto mt-10">
              <Gamepad2 size={80} className="mx-auto text-gray-300 mb-6" />
              <p className="font-black text-3xl uppercase tracking-tighter text-black mb-2">AWAITING MISSIONS</p>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">No data available in sector.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {months.map(({ label, items }) => (
                <div key={label} className="relative">
                  {/* Month header */}
                  <div className="flex items-center gap-4 mb-6 sticky top-4 z-10 bg-[#FAFAFA]/90 backdrop-blur-sm py-2">
                    <div className="w-10 h-10 rounded-xl bg-pink-500 border-[3px] border-black flex items-center justify-center shrink-0 shadow-[3px_3px_0_0_#000] transform -rotate-3">
                      <Zap size={20} className="text-white fill-white" />
                    </div>
                    <span className="text-xl font-black text-black uppercase tracking-tighter bg-white border-[3px] border-black px-4 py-1.5 rounded-xl shadow-[3px_3px_0_0_#000]">{label}</span>
                    <div className="flex-1 h-1.5 bg-black rounded-full" />
                  </div>
                  
                  {/* Cards */}
                  <div className="space-y-6 pl-4 sm:pl-14 border-l-[4px] border-black/10 ml-5 sm:ml-5">
                    {items.map(p => {
                      const ss = STATUS_STYLES[p.status] ?? STATUS_STYLES.completed;
                      return (
                        <div key={p.id} className="bg-white rounded-2xl border-[4px] border-black shadow-[6px_6px_0_0_#000] overflow-hidden relative transition-transform hover:-translate-y-1">
                          {/* Delete overlay */}
                          {managing && (
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={deletingId === p.id}
                              className="absolute top-3 right-3 z-30 flex items-center gap-2 bg-red-500 text-white text-xs font-black uppercase tracking-widest border-[3px] border-black rounded-xl px-3 py-1.5 shadow-[3px_3px_0_0_#000] hover:translate-y-[1px] hover:translate-x-[1px] active:shadow-none transition-all"
                            >
                              <Trash2 size={14} />
                              {deletingId === p.id ? "..." : "DELETE"}
                            </button>
                          )}
                          
                          <div className="flex flex-col sm:flex-row">
                            <div className="p-6 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-3 mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest border-[2px] border-black rounded-full px-3 py-1 shadow-[2px_2px_0_0_#000]"
                                  style={{ color: ss.color, background: ss.bg }}>{ss.label}</span>
                                {p.completed_at && (
                                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-black bg-gray-100 border-[2px] border-black rounded-full px-3 py-1 shadow-[2px_2px_0_0_#000]">
                                    <Clock size={12} /> {fmtDate(p.completed_at)}
                                  </span>
                                )}
                              </div>
                              
                              <h3 className="font-black text-2xl sm:text-3xl text-black uppercase tracking-tight leading-none mb-3">{p.title}</h3>
                              
                              {p.location && (
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                                  <MapPin size={14} className="text-black" /> {p.location}
                                </p>
                              )}
                              
                              {p.description && (
                                <p className="text-sm font-medium text-gray-700 leading-relaxed mb-5 bg-gray-50 p-4 border-[2px] border-black rounded-xl">
                                  {p.description}
                                </p>
                              )}
                              
                              <div className="flex flex-wrap gap-2 items-center">
                                {p.cost && (
                                  <span className="flex items-center gap-1 text-xs font-black text-black bg-green-300 border-[2px] border-black rounded-lg px-3 py-1 shadow-[2px_2px_0_0_#000]">
                                    <DollarSign size={12} className="text-black" /> {fmtMoney(p.cost)}
                                  </span>
                                )}
                                {p.tags.map((tag, i) => (
                                  <span key={i} className="text-[10px] font-black uppercase tracking-widest bg-cyan-200 border-[2px] border-black text-black rounded-lg px-2.5 py-1 shadow-[2px_2px_0_0_#000]">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            {/* Right: large photo fills card height */}
                            {p.photos[0] && (
                              <div className="relative shrink-0 w-full sm:w-64 border-t-[4px] sm:border-t-0 sm:border-l-[4px] border-black bg-black">
                                <img src={p.photos[0].url} alt={p.photos[0].caption || p.title}
                                  className="w-full h-48 sm:h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </div>
                          
                          {/* Thumbnail strip */}
                          {p.photos.length > 1 && (
                            <div className="p-4 bg-gray-900 border-t-[4px] border-black flex gap-3 overflow-x-auto">
                              {p.photos.slice(1, 5).map((ph, i) => (
                                <div key={i} className="flex-shrink-0 w-20 h-20 border-[3px] border-black rounded-xl overflow-hidden bg-black shadow-[3px_3px_0_0_rgba(255,255,255,0.2)]">
                                  <img src={ph.url} alt={ph.caption || p.title}
                                    className="w-full h-full object-cover" />
                                </div>
                              ))}
                              {p.photos.length > 5 && (
                                <div className="flex-shrink-0 w-20 h-20 border-[3px] border-black rounded-xl bg-yellow-400 flex items-center justify-center text-lg font-black text-black shadow-[3px_3px_0_0_#000]">
                                  +{p.photos.length - 5}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* PROJECTS (Grid Mode) */}
        {activeTab === "MISSIONS" && (
          projects.length === 0 ? (
            <div className="bg-white border-[4px] border-black rounded-3xl p-12 shadow-[8px_8px_0_0_#000] text-center max-w-2xl mx-auto mt-10">
              <Gamepad2 size={80} className="mx-auto text-gray-300 mb-6" />
              <p className="font-black text-3xl uppercase tracking-tighter text-black mb-2">NO MISSIONS FOUND</p>
            </div>
          ) : (
            <div className="space-y-6">
              {tagCounts.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-4">
                  {tagCounts.map(([tag, count]) => (
                    <span key={tag} className="shrink-0 text-xs font-black uppercase tracking-widest bg-white border-[3px] border-black rounded-xl px-4 py-2 text-black shadow-[3px_3px_0_0_#000]">
                      {tag} <span className="text-gray-400 bg-gray-100 rounded px-1 ml-1">{count}</span>
                    </span>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(p => {
                  const ss = STATUS_STYLES[p.status] ?? STATUS_STYLES.completed;
                  const ba = detectBeforeAfter(p.photos);
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border-[4px] border-black shadow-[6px_6px_0_0_#000] flex flex-col overflow-hidden relative group hover:-translate-y-1 transition-transform">
                      {managing && (
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="absolute top-2 right-2 z-30 flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-black uppercase border-[3px] border-black rounded-lg px-2 py-1 shadow-[2px_2px_0_0_#000]"
                        >
                          <Trash2 size={12} /> {deletingId === p.id ? "..." : "DEL"}
                        </button>
                      )}
                      
                      {ba ? (
                        <BeforeAfterSlider before={ba.before} after={ba.after} />
                      ) : p.photos[0] ? (
                        <div className="h-48 border-b-[4px] border-black bg-black relative">
                          <img src={p.photos[0].url} alt="Cover" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ) : (
                        <div className="h-48 border-b-[4px] border-black bg-gray-100 flex items-center justify-center">
                          <Camera size={32} className="text-gray-300" />
                        </div>
                      )}
                      
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-start gap-2 mb-2">
                          <h3 className="font-black text-xl uppercase tracking-tight text-black leading-none flex-1">{p.title}</h3>
                        </div>
                        <div className="mb-4">
                           <span className="inline-block text-[9px] font-black uppercase tracking-widest border-[2px] border-black rounded-md px-2 py-0.5 shadow-[2px_2px_0_0_#000]"
                              style={{ color: ss.color, background: ss.bg }}>{ss.label}</span>
                        </div>
                        
                        {p.description && (
                          <p className="text-sm font-medium text-gray-600 line-clamp-3 mb-4 flex-1">{p.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t-[3px] border-gray-100">
                          {p.location && (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-gray-100 border-[2px] border-black rounded-md px-2 py-1 text-black shadow-[2px_2px_0_0_#000]">
                              <MapPin size={10} /> {p.location.split(",")[0]}
                            </span>
                          )}
                          {p.cost && (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-green-200 border-[2px] border-black rounded-md px-2 py-1 text-black shadow-[2px_2px_0_0_#000]">
                              <DollarSign size={10} /> {fmtMoney(p.cost)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* INTEL (Photos) */}
        {activeTab === "INTEL" && (
          allPhotos.length === 0 ? (
            <div className="bg-white border-[4px] border-black rounded-3xl p-12 shadow-[8px_8px_0_0_#000] text-center max-w-2xl mx-auto mt-10">
              <Camera size={80} className="mx-auto text-gray-300 mb-6" />
              <p className="font-black text-3xl uppercase tracking-tighter text-black mb-2">NO INTEL CAPTURED</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
              {allPhotos.map((ph, i) => (
                <div key={i} className="break-inside-avoid relative group rounded-2xl border-[4px] border-black shadow-[6px_6px_0_0_#000] overflow-hidden bg-black">
                  <img src={ph.url} alt={ph.caption || ph.project} className="w-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-5">
                    <p className="text-white font-black uppercase tracking-widest text-xs mb-1 bg-black/50 w-fit px-2 py-1 rounded border-[2px] border-white/20 backdrop-blur-sm">{ph.project}</p>
                    {ph.caption && <p className="text-gray-200 text-sm font-medium">{ph.caption}</p>}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

      </div>
    </div>
  );
}
