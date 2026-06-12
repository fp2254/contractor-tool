"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Star, CheckCircle, DollarSign, Users, Briefcase, Globe,
  Edit3, ExternalLink, MapPin, Phone, Shield, Award,
  Clock, ChevronRight, TrendingUp, MessageSquare, Wrench,
} from "lucide-react";

type Business = {
  name: string;
  phone: string;
  address: string;
  logoUrl: string | null;
  licenseNumber: string;
  ownerName: string;
  ownerTitle: string;
};

type PublicProfile = {
  slug: string;
  isPublished: boolean;
  trade: string;
  tagline: string;
  photoUrl: string | null;
  serviceArea: string;
  urgencyLine: string;
  yearsExperience: number;
  licenseText: string;
  services: string[];
  aboutBullets: string[];
  photos: unknown[];
  selectedTemplate: string;
} | null;

type Stats = {
  completedJobs: number;
  customerCount: number;
  totalRevenue: number;
  avgRating: number | null;
  reviewCount: number;
  webLeads: number;
};

type Review = {
  reviewerName: string;
  rating: number;
  text: string;
  jobType: string;
  location: string;
  verified: boolean;
  createdAt: string;
};

type Job = {
  id: string;
  title: string;
  status: string;
  completedDate: string | null;
  scheduledDate: string | null;
  createdAt: string;
};

const TABS = ["Overview", "Reviews", "Services", "Photos"] as const;
type Tab = typeof TABS[number];

const PRO_BASE = "https://tradebase.contractors/pro";
const PROFILE_BASE = "https://tradebase.contractors/contractor";

function StarRating({ rating, size = 13 }: { rating: number; size?: number }) {
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

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function JobStatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "#16A34A", scheduled: "#2563EB", in_progress: "#D97706",
    cancelled: "#DC2626", pending: "#9CA3AF",
  };
  return <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: colors[status] ?? "#9CA3AF" }} />;
}

export default function ContractorProfileDashboard({
  business, publicProfile, stats, reviews, recentJobs,
}: {
  business: Business;
  publicProfile: PublicProfile;
  stats: Stats;
  reviews: Review[];
  recentJobs: Job[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  const publicUrl = publicProfile?.slug ? `${PRO_BASE}/${publicProfile.slug}` : null;
  const profileUrl = publicProfile?.slug ? `${PROFILE_BASE}/${publicProfile.slug}` : null;
  const initials = business.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "CO";

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">

      {/* Header row */}
      <div className="flex items-center gap-3 mb-1">
        <Link href="/app/more" className="text-gray-400 hover:text-gray-600">
          <ChevronRight size={20} className="rotate-180" />
        </Link>
        <h1 className="text-xl font-bold text-slate-800 flex-1">My Profile</h1>
        <Link href="/app/profile/public-profile"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
          style={{ backgroundColor: "#1B3A6B" }}>
          <Edit3 size={12} /> Edit Public Profile
        </Link>
      </div>

      {/* Public page status bar */}
      <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${publicProfile?.isPublished ? "bg-green-500" : publicProfile ? "bg-amber-400" : "bg-gray-300"}`} />
          <span className="text-sm font-semibold text-gray-700">
            Public page: {publicProfile?.isPublished ? "Live" : publicProfile ? "Draft" : "Not set up"}
          </span>
        </div>
        <Link href="/app/profile" className="text-xs font-bold text-white px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#1B3A6B" }}>
          {publicProfile ? "Manage →" : "Set Up →"}
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* ── Main column ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Profile header card */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {/* Banner */}
            <div className="h-56 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1B3A6B 0%, #0f2347 100%)" }}>
              <img
                src={publicProfile?.photoUrl || "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&h=400&fit=crop"}
                alt="banner" className="w-full h-full object-cover opacity-60"
              />
              {/* Avatar */}
              <div className="absolute -bottom-8 left-5">
                {business.logoUrl ? (
                  <img src={business.logoUrl} alt="logo" className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover bg-white" />
                ) : (
                  <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: "#1B3A6B" }}>
                    {initials}
                  </div>
                )}
              </div>
              {/* Actions */}
              <div className="absolute bottom-3 right-4 flex gap-2">
                {publicUrl && (
                  <a href={publicUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 border border-white/20 rounded-lg text-xs font-semibold text-gray-800 shadow-sm">
                    <ExternalLink size={11} /> View Live Page
                  </a>
                )}
                <Link href="/app/profile/public-profile"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
                  <Edit3 size={11} /> Edit
                </Link>
              </div>
            </div>

            {/* Info */}
            <div className="px-5 pt-10 pb-5">
              <div className="flex items-start gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900">{business.name}</h2>
                {publicProfile?.isPublished && (
                  <span className="shrink-0 mt-1 text-[10px] font-bold bg-green-100 text-green-700 rounded-full px-2 py-0.5">Live</span>
                )}
              </div>
              {publicProfile?.trade && <p className="text-sm text-blue-600 font-semibold mb-1">{publicProfile.trade}</p>}
              {publicProfile?.tagline && <p className="text-xs text-gray-500 mb-3 leading-relaxed">{publicProfile.tagline}</p>}

              <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap mb-5">
                {business.phone && <span className="flex items-center gap-1"><Phone size={11} /> {business.phone}</span>}
                {(publicProfile?.serviceArea || business.address) && (
                  <span className="flex items-center gap-1"><MapPin size={11} /> {publicProfile?.serviceArea || business.address}</span>
                )}
                {(publicProfile?.licenseText || business.licenseNumber) && (
                  <span className="flex items-center gap-1"><Shield size={11} /> {publicProfile?.licenseText || business.licenseNumber}</span>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: Briefcase,   value: stats.completedJobs.toString(),                     label: "Jobs Done" },
                  { icon: DollarSign, value: fmtMoney(stats.totalRevenue),                        label: "Revenue" },
                  { icon: Users,      value: stats.customerCount.toString(),                      label: "Customers" },
                  { icon: Star,       value: stats.avgRating ? `${stats.avgRating} ★` : "—",     label: `${stats.reviewCount} Reviews` },
                ].map(({ icon: Icon, value, label }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-base font-bold text-gray-900">{value}</p>
                    <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="border-t border-gray-100 px-5">
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
          {activeTab === "Overview" && (
            <div className="space-y-4">
              {/* Recent Jobs Timeline */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Recent Jobs</h3>
                  <Link href="/app/jobs" className="text-xs text-blue-600 font-semibold">View All</Link>
                </div>
                {recentJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-3xl mb-2">🔧</p>
                    <p className="text-sm font-medium text-gray-600">No jobs yet</p>
                    <Link href="/app/jobs/new" className="mt-3 inline-block text-xs font-bold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: "#1B3A6B" }}>
                      Create First Job
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-0 divide-y divide-gray-50">
                    {recentJobs.slice(0, 10).map((job, idx) => (
                      <Link key={job.id} href={`/app/jobs/${job.id}`}
                        className="flex items-center gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                        <div className="flex flex-col items-center gap-1 shrink-0 w-12">
                          <JobStatusDot status={job.status} />
                          {idx < recentJobs.length - 1 && <div className="w-0.5 h-4 bg-gray-100" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{job.title}</p>
                          <p className="text-xs text-gray-400 capitalize">
                            {job.status.replace("_", " ")}
                            {job.completedDate ? ` · ${fmtDate(job.completedDate)}` : job.scheduledDate ? ` · ${fmtDate(job.scheduledDate)}` : ""}
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-gray-300 shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Website Leads */}
              {stats.webLeads > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F97316" + "20" }}>
                        <Globe size={18} style={{ color: "#F97316" }} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{stats.webLeads} Website Quote Request{stats.webLeads !== 1 ? "s" : ""}</p>
                        <p className="text-xs text-gray-400">From your public profile landing page</p>
                      </div>
                    </div>
                    <Link href="/app/leads?source=Website" className="text-xs font-bold text-blue-600">View →</Link>
                  </div>
                </div>
              )}

              {/* Quick Links */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Edit Public Profile",  href: "/app/profile/public-profile",                                  icon: Edit3,         color: "#1B3A6B" },
                    { label: "View Live Page",       href: publicUrl ?? null,                                              icon: ExternalLink,  color: "#2563EB", external: true },
                    { label: "My Portfolio",         href: publicProfile?.slug ? `/showcase/${publicProfile.slug}` : null, icon: Briefcase,     color: "#8B5CF6", external: true },
                    { label: "Completed Projects",   href: "/app/projects",                                                icon: Wrench,        color: "#16A34A" },
                    { label: "Settings",             href: "/app/profile",                                                 icon: Wrench,        color: "#6B7280" },
                    { label: "Request a Review",     href: publicUrl ? `${publicUrl}/review` : null,                      icon: MessageSquare, color: "#F59E0B", external: true },
                  ].filter(a => a.href).map(({ label, href, icon: Icon, color, external }) => (
                    external && href ? (
                      <a key={label} href={href!} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                        <Icon size={14} style={{ color }} />
                        <span className="text-xs font-semibold text-gray-700">{label}</span>
                      </a>
                    ) : (
                      <Link key={label} href={href!}
                        className="flex items-center gap-2 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                        <Icon size={14} style={{ color }} />
                        <span className="text-xs font-semibold text-gray-700">{label}</span>
                      </Link>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Reviews" && (
            <div className="space-y-3">
              {reviews.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                  <p className="text-4xl mb-3">⭐</p>
                  <p className="font-semibold text-gray-700 mb-1">No reviews yet</p>
                  <p className="text-xs text-gray-400 mb-4">Share your profile link with happy customers to collect reviews.</p>
                  {publicUrl && (
                    <a href={`${publicUrl}/review`} target="_blank" rel="noreferrer"
                      className="inline-block text-xs font-bold text-white px-4 py-2 rounded-lg"
                      style={{ backgroundColor: "#1B3A6B" }}>
                      Share Review Link
                    </a>
                  )}
                </div>
              ) : reviews.map((r, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
                      {r.reviewerName.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-bold text-sm text-gray-800">{r.reviewerName}</span>
                        {r.verified && <CheckCircle size={12} fill="#16A34A" className="text-white" />}
                        {r.jobType && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{r.jobType}</span>}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <StarRating rating={r.rating} />
                        <span className="text-[10px] text-gray-400">{fmtDate(r.createdAt.slice(0, 10))}</span>
                        {r.location && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><MapPin size={9} />{r.location}</span>}
                      </div>
                      {r.text && <p className="text-sm text-gray-600 leading-relaxed italic">&ldquo;{r.text}&rdquo;</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "Services" && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Services Offered</h3>
                <Link href="/app/profile/public-profile" className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                  <Edit3 size={11} /> Edit
                </Link>
              </div>
              {!publicProfile?.services?.length ? (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">🔧</p>
                  <p className="text-sm font-medium text-gray-600 mb-3">No services listed yet</p>
                  <Link href="/app/profile/public-profile" className="text-xs font-bold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: "#1B3A6B" }}>
                    Add Services
                  </Link>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {publicProfile.services.map((s, i) => (
                    <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{s}</span>
                  ))}
                </div>
              )}
              {publicProfile?.aboutBullets && publicProfile.aboutBullets.length > 0 && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">About</h4>
                  <div className="space-y-2">
                    {publicProfile.aboutBullets.map((b: string, i: number) => (
                      <p key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="shrink-0 mt-0.5">✓</span>
                        <span>{b}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "Photos" && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Project Photos</h3>
                <Link href="/app/profile/public-profile" className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                  <Edit3 size={11} /> Edit
                </Link>
              </div>
              {!publicProfile?.photos?.length ? (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">📷</p>
                  <p className="text-sm font-medium text-gray-600 mb-1">No project photos yet</p>
                  <p className="text-xs text-gray-400 mb-4">Photos build trust and help win more leads from your landing page.</p>
                  <Link href="/app/profile/public-profile" className="text-xs font-bold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: "#1B3A6B" }}>
                    Add Photos
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {(publicProfile.photos as any[]).slice(0, 9).map((p: any, i: number) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                      {p.url && <img src={p.url} alt={p.title ?? ""} className="w-full h-full object-cover" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-full lg:w-72 shrink-0 space-y-4">
          {/* Business Settings shortcut */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Business Settings</h3>
            <div className="space-y-2">
              {[
                { label: "Public Profile & Page", href: "/app/profile", note: publicProfile?.isPublished ? "● Live" : publicProfile ? "● Draft" : "Not set up", noteColor: publicProfile?.isPublished ? "text-green-600" : "text-amber-500" },
                { label: "Business Identity", href: "/app/profile", note: "Logo, address, license" },
                { label: "Quote & Invoice Defaults", href: "/app/profile", note: "Terms, pricing, tax" },
                { label: "Service Presets", href: "/app/profile", note: "Pricing shortcuts" },
              ].map(({ label, href, note, noteColor }) => (
                <Link key={label} href={href}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 border border-gray-100 hover:bg-gray-50 transition-colors">
                  <span className="text-xs font-semibold text-gray-700">{label}</span>
                  <span className={`text-[10px] font-medium ${noteColor ?? "text-gray-400"}`}>{note} ›</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Performance metrics */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Performance</h3>
            <div className="space-y-3">
              {[
                { icon: Briefcase,    label: "Jobs Completed",     value: stats.completedJobs.toString(),     color: "#1B3A6B" },
                { icon: DollarSign,  label: "Paid Revenue",       value: fmtMoney(stats.totalRevenue),       color: "#16A34A" },
                { icon: Users,       label: "Total Customers",    value: stats.customerCount.toString(),     color: "#2563EB" },
                { icon: Globe,       label: "Web Quote Requests", value: stats.webLeads.toString(),          color: "#F97316" },
                { icon: Star,        label: "Avg Review",         value: stats.avgRating ? `${stats.avgRating}/5` : "—", color: "#F59E0B" },
                { icon: TrendingUp,  label: "Total Reviews",      value: stats.reviewCount.toString(),       color: "#8B5CF6" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={13} style={{ color }} />
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Profile strength */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Profile Strength</h3>
            {(() => {
              const checks = [
                { label: "Profile published",  done: !!publicProfile?.isPublished },
                { label: "Trade set",          done: !!(publicProfile?.trade) },
                { label: "Tagline added",      done: !!(publicProfile?.tagline) },
                { label: "Services listed",    done: (publicProfile?.services?.length ?? 0) > 0 },
                { label: "Photos uploaded",    done: (publicProfile?.photos?.length ?? 0) > 0 },
                { label: "Has reviews",        done: stats.reviewCount > 0 },
                { label: "License on profile", done: !!(publicProfile?.licenseText || business.licenseNumber) },
              ];
              const score = Math.round((checks.filter(c => c.done).length / checks.length) * 100);
              const color = score >= 80 ? "#16A34A" : score >= 50 ? "#F59E0B" : "#DC2626";
              return (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold" style={{ color }}>{score}%</span>
                    <span className="text-xs font-bold" style={{ color }}>
                      {score >= 80 ? "Strong" : score >= 50 ? "Fair" : "Weak"}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full mb-3 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
                  </div>
                  <div className="space-y-1.5">
                    {checks.map(({ label, done }) => (
                      <div key={label} className="flex items-center gap-2">
                        {done ? <CheckCircle size={12} fill="#16A34A" className="text-white shrink-0" />
                              : <div className="w-3 h-3 rounded-full border-2 border-gray-200 shrink-0" />}
                        <span className={`text-[11px] ${done ? "text-gray-600" : "text-gray-400"}`}>{label}</span>
                      </div>
                    ))}
                  </div>
                  {score < 100 && (
                    <Link href="/app/profile/public-profile"
                      className="mt-3 block w-full text-center rounded-xl py-2 text-xs font-bold text-white"
                      style={{ backgroundColor: "#1B3A6B" }}>
                      Improve Profile
                    </Link>
                  )}
                </>
              );
            })()}
          </div>

          {/* Awards */}
          {(stats.completedJobs >= 10 || stats.reviewCount >= 5) && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Badges</h3>
              <div className="flex flex-wrap gap-2">
                {stats.completedJobs >= 10 && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full text-[11px] font-bold text-blue-700">
                    <Award size={11} /> 10+ Jobs
                  </span>
                )}
                {stats.completedJobs >= 50 && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full text-[11px] font-bold text-blue-700">
                    <Award size={11} /> 50+ Jobs
                  </span>
                )}
                {stats.reviewCount >= 5 && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full text-[11px] font-bold text-amber-700">
                    <Star size={11} /> 5+ Reviews
                  </span>
                )}
                {stats.avgRating && stats.avgRating >= 4.8 && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full text-[11px] font-bold text-green-700">
                    <Star size={11} fill="#16A34A" className="text-white" /> Top Rated
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
