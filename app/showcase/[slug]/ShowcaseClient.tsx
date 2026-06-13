"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  MapPin, CheckCircle, DollarSign,
  Briefcase, ExternalLink, Camera, Tag, Share2, Check,
  ArrowLeftRight, Clock, Pencil, Trash2, X,
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

/** Detect "before" photo index from captions, fall back to first photo */
function detectBeforeAfter(photos: Photo[]): { before: Photo; after: Photo } | null {
  if (photos.length < 2) return null;
  const bIdx = photos.findIndex(p => /\bbefore\b/i.test(p.caption));
  const aIdx = photos.findIndex(p => /\bafter\b/i.test(p.caption));
  if (bIdx !== -1 && aIdx !== -1 && bIdx !== aIdx) {
    return { before: photos[bIdx], after: photos[aIdx] };
  }
  // Default: first = before, last = after
  return { before: photos[0], after: photos[photos.length - 1] };
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  completed:   { label: "Completed",   color: "#16A34A", bg: "#DCFCE7" },
  in_progress: { label: "In Progress", color: "#D97706", bg: "#FEF3C7" },
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
    <div ref={containerRef} className="relative w-full select-none overflow-hidden rounded-t-2xl" style={{ height: 220 }}
      onMouseDown={onMouseDown} onTouchStart={onTouchStart}>
      {/* After (bottom, full width) */}
      <img src={after.url} alt="After" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      {/* Before (top, clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img src={before.url} alt="Before" className="absolute inset-0 w-full h-full object-cover" style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : "100%" }} draggable={false} />
      </div>
      {/* Divider line */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg" style={{ left: `${pos}%`, transform: "translateX(-50%)" }}>
        {/* Handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center cursor-ew-resize">
          <ArrowLeftRight size={14} className="text-gray-500" />
        </div>
      </div>
      {/* Labels */}
      <div className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/50 rounded-full px-2 py-0.5 backdrop-blur-sm">BEFORE</div>
      <div className="absolute bottom-2 right-2 text-[10px] font-bold text-white bg-black/50 rounded-full px-2 py-0.5 backdrop-blur-sm">AFTER</div>
    </div>
  );
}

// ── Share button ────────────────────────────────────────────────────────────
function ShareButton({ name, slug }: { name: string; slug: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/showcase/${slug}`;
    const text = `Check out ${name}'s project portfolio on TradeBase`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: text, url });
        return;
      } catch {
        // user cancelled or not supported — fall through
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button onClick={handleShare}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-colors"
      style={{ backgroundColor: copied ? "#16A34A" : "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
      {copied ? <><Check size={11} /> Copied!</> : <><Share2 size={11} /> Share</>}
    </button>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ShowcaseClient({ profile, stats, projects: initialProjects, isOwner = false }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Timeline");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [managing, setManaging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Remove this project from your showcase?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/projects/api/${id}`, { method: "DELETE" });
      if (res.ok) setProjects(ps => ps.filter(p => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  const allPhotos = useMemo(() =>
    projects.flatMap(p => p.photos.map(ph => ({ ...ph, project: p.title }))),
    [projects]
  );

  // Use first real project photo as banner (no external Unsplash dependency)
  const bannerUrl = useMemo(() => allPhotos[0]?.url ?? null, [allPhotos]);

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
        <div className="h-56 bg-gradient-to-br from-[#1B3A6B] to-[#0f2347] relative overflow-hidden">
          {bannerUrl && (
            <img src={bannerUrl} alt="banner"
              className="absolute inset-0 w-full h-full object-cover opacity-60" />
          )}
          {isOwner && (
            <a href="/app/more"
              className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm z-10"
              style={{ backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}>
              ← Back
            </a>
          )}
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
          {/* Action buttons */}
          <div className="absolute bottom-3 right-4 flex gap-2">
            {isOwner && (
              <button
                onClick={() => setManaging(m => !m)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors"
                style={{
                  backgroundColor: managing ? "#DC2626" : "rgba(255,255,255,0.2)",
                  color: "white",
                  backdropFilter: managing ? undefined : "blur(4px)",
                }}>
                {managing ? <><X size={11} /> Done</> : <><Pencil size={11} /> Manage</>}
              </button>
            )}
            <ShareButton name={profile.name} slug={profile.slug} />
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
          <div className="grid grid-cols-3 gap-2 mt-5 border-t border-gray-100 pt-5">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{stats.projectCount}</p>
              <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Completed Projects</p>
            </div>
            <div className="text-center border-x border-gray-100">
              <p className="text-xl font-bold text-gray-900">
                {stats.totalInvested > 0 ? fmtMoney(stats.totalInvested) : "—"}
              </p>
              <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Total Value</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{allPhotos.length}</p>
              <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Photos</p>
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

      {/* ── Content + Sidebar ── */}
      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="lg:flex lg:gap-6 items-start">

          {/* ── Main column ── */}
          <div className="flex-1 min-w-0 space-y-4">

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
                      {/* Month header — OUTSIDE cards, green checkmark like mockup */}
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                          <CheckCircle size={13} className="text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-sm font-semibold text-gray-600">{label}</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      {/* Individual project cards */}
                      <div className="space-y-3">
                        {items.map(p => {
                          const ss = STATUS_STYLES[p.status] ?? STATUS_STYLES.completed;
                          return (
                            <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden relative">
                              {/* Delete overlay (manage mode) */}
                              {managing && (
                                <button
                                  onClick={() => handleDelete(p.id)}
                                  disabled={deletingId === p.id}
                                  className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-red-500 text-white text-[11px] font-bold rounded-full px-2.5 py-1 shadow-lg active:bg-red-600 disabled:opacity-60"
                                >
                                  <Trash2 size={11} />
                                  {deletingId === p.id ? "Removing…" : "Remove"}
                                </button>
                              )}
                              {/* Card body: text LEFT + large portrait photo RIGHT */}
                              <div className="p-4 flex gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start gap-2 mb-1.5">
                                    <h3 className="font-bold text-[15px] text-gray-900 leading-snug flex-1">{p.title}</h3>
                                    <span className="text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0 mt-0.5"
                                      style={{ color: ss.color, background: ss.bg }}>{ss.label}</span>
                                  </div>
                                  {p.location && (
                                    <p className="text-xs text-gray-400 flex items-center gap-1 mb-1.5">
                                      <MapPin size={10} />{p.location}
                                    </p>
                                  )}
                                  {p.description && (
                                    <p className="text-[13px] text-gray-600 leading-relaxed mb-2.5 line-clamp-3">{p.description}</p>
                                  )}
                                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 items-center">
                                    {p.cost && (
                                      <span className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                                        <DollarSign size={10} className="text-gray-400" />{fmtMoney(p.cost)}
                                      </span>
                                    )}
                                    {p.completed_at && (
                                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                        <Clock size={10} />Completed {fmtDate(p.completed_at)}
                                      </span>
                                    )}
                                    {p.tags.map((tag, i) => (
                                      <span key={i} className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{tag}</span>
                                    ))}
                                  </div>
                                </div>
                                {/* Right: large photo fills card height */}
                                {p.photos[0] && (
                                  <div className="relative shrink-0 w-28">
                                    <img src={p.photos[0].url} alt={p.photos[0].caption || p.title}
                                      className="w-28 rounded-xl object-cover"
                                      style={{ height: "100%", minHeight: "130px", maxHeight: "200px" }} />
                                  </div>
                                )}
                              </div>
                              {/* Thumbnail strip — below main content */}
                              {p.photos.length > 1 && (
                                <div className="px-4 pb-4 flex gap-2">
                                  {p.photos.slice(1, 5).map((ph, i) => (
                                    <div key={i} className="flex-1 max-w-[72px]">
                                      <img src={ph.url} alt={ph.caption || p.title}
                                        className="w-full h-14 rounded-xl object-cover" />
                                    </div>
                                  ))}
                                  {p.photos.length > 5 && (
                                    <div className="flex-1 max-w-[72px] h-14 rounded-xl bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-500">
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

            {/* PROJECTS — same card style as timeline */}
            {activeTab === "Projects" && (
              projects.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                  <p className="text-5xl mb-3">📁</p>
                  <p className="font-semibold text-gray-700">No projects yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tagCounts.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {tagCounts.map(([tag, count]) => (
                        <span key={tag} className="shrink-0 text-xs font-semibold bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 shadow-sm">
                          {tag} <span className="text-gray-400">({count})</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {projects.map(p => {
                    const ss = STATUS_STYLES[p.status] ?? STATUS_STYLES.completed;
                    const ba = detectBeforeAfter(p.photos);
                    return (
                      <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden relative">
                        {/* Delete overlay (manage mode) */}
                        {managing && (
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-red-500 text-white text-[11px] font-bold rounded-full px-2.5 py-1 shadow-lg active:bg-red-600 disabled:opacity-60"
                          >
                            <Trash2 size={11} />
                            {deletingId === p.id ? "Removing…" : "Remove"}
                          </button>
                        )}
                        <div className="p-4 flex gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-1.5">
                              <h3 className="font-bold text-[15px] text-gray-900 leading-snug flex-1">{p.title}</h3>
                              <span className="text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0 mt-0.5"
                                style={{ color: ss.color, background: ss.bg }}>{ss.label}</span>
                            </div>
                            {p.location && (
                              <p className="text-xs text-gray-400 flex items-center gap-1 mb-1.5">
                                <MapPin size={10} />{p.location}
                              </p>
                            )}
                            {p.description && (
                              <p className="text-[13px] text-gray-600 leading-relaxed mb-2.5 line-clamp-3">{p.description}</p>
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-1.5 items-center">
                              {p.cost && (
                                <span className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                                  <DollarSign size={10} className="text-gray-400" />{fmtMoney(p.cost)}
                                </span>
                              )}
                              {p.completed_at && (
                                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                  <Clock size={10} />{fmtDate(p.completed_at)}
                                </span>
                              )}
                              {ba && <span className="text-[10px] font-semibold text-purple-600">Before &amp; After ✓</span>}
                              {p.tags.map((tag, i) => (
                                <span key={i} className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{tag}</span>
                              ))}
                            </div>
                          </div>
                          {p.photos[0] && (
                            <div className="relative shrink-0 w-28">
                              <img src={p.photos[0].url} alt={p.title}
                                className="w-28 rounded-xl object-cover"
                                style={{ height: "100%", minHeight: "130px", maxHeight: "200px" }} />
                            </div>
                          )}
                        </div>
                        {ba && <div className="px-4 pb-4"><BeforeAfterSlider before={ba.before} after={ba.after} /></div>}
                        {p.photos.length > 1 && !ba && (
                          <div className="px-4 pb-4 flex gap-2">
                            {p.photos.slice(1, 5).map((ph, i) => (
                              <div key={i} className="flex-1 max-w-[72px]">
                                <img src={ph.url} alt={p.title}
                                  className="w-full h-14 rounded-xl object-cover" />
                              </div>
                            ))}
                            {p.photos.length > 5 && (
                              <div className="flex-1 max-w-[72px] h-14 rounded-xl bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-500">
                                +{p.photos.length - 5}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                  <p className="text-xs text-gray-400 font-semibold">
                    {allPhotos.length} photo{allPhotos.length !== 1 ? "s" : ""} across {projects.filter(p => p.photos.length > 0).length} project{projects.filter(p => p.photos.length > 0).length !== 1 ? "s" : ""}
                  </p>
                  <div className="columns-2 sm:columns-3 gap-2 space-y-2">
                    {allPhotos.map((ph, i) => (
                      <div key={i} className="break-inside-avoid rounded-xl overflow-hidden bg-gray-100">
                        <img src={ph.url} alt={ph.caption || ph.project} className="w-full object-cover" />
                        {ph.caption && <p className="text-[10px] text-gray-500 px-2 py-1 truncate">{ph.caption}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* Mobile CTA (hidden on desktop — desktop has sidebar CTA) */}
            {profile.is_published && (
              <div className="lg:hidden bg-[#1B3A6B] rounded-2xl p-5 text-center shadow-sm">
                <p className="text-white font-bold mb-1">Work with {profile.name.split(" ")[0]}</p>
                <p className="text-blue-200 text-xs mb-4">Get a free quote for your next project</p>
                <a href={`/pro/${profile.slug}`}
                  className="inline-block bg-white text-[#1B3A6B] font-bold text-sm px-6 py-2.5 rounded-xl shadow-sm">
                  Get a Free Quote →
                </a>
              </div>
            )}
          </div>

          {/* ── Right sidebar (desktop only) ── */}
          <div className="hidden lg:block w-72 shrink-0 space-y-4">

            {/* Business Overview */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">Business Overview</h3>
              <div className="space-y-3">
                {profile.trade && (
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-gray-400">Trade</span>
                    <span className="text-xs font-semibold text-gray-700 text-right ml-4">{profile.trade}</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-gray-400">Service Area</span>
                    <span className="text-xs font-semibold text-gray-700 text-right ml-4">{profile.location}</span>
                  </div>
                )}
                {profile.years_experience != null && (
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-gray-400">Experience</span>
                    <span className="text-xs font-semibold text-gray-700 text-right ml-4">{profile.years_experience} years</span>
                  </div>
                )}
                {profile.license_text && (
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-gray-400">License</span>
                    <span className="text-xs font-semibold text-gray-700 text-right ml-4">{profile.license_text}</span>
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <span className="text-xs text-gray-400">Projects</span>
                  <span className="text-xs font-semibold text-gray-700">{stats.projectCount} completed</span>
                </div>
                {stats.totalInvested > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-gray-400">Total Value</span>
                    <span className="text-xs font-semibold text-gray-700">{fmtMoney(stats.totalInvested)}</span>
                  </div>
                )}
              </div>
              {profile.is_published && (
                <a href={`/pro/${profile.slug}`}
                  className="mt-5 block w-full text-center text-white font-bold text-sm py-3 rounded-xl shadow-sm"
                  style={{ backgroundColor: "#1B3A6B" }}>
                  Get a Free Quote →
                </a>
              )}
            </div>

            {/* Photos preview */}
            {allPhotos.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">Photos</h3>
                  <button onClick={() => setActiveTab("Photos")}
                    className="text-xs font-semibold" style={{ color: "#1B3A6B" }}>
                    View all {allPhotos.length}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {allPhotos.slice(0, 6).map((ph, i) => (
                    <img key={i} src={ph.url} alt={ph.caption || ph.project}
                      className="w-full aspect-square object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
