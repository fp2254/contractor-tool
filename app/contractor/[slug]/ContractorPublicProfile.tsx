"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Star, CheckCircle, MapPin, Phone, Shield, Award, Clock,
  ChevronRight, MessageSquare, Wrench, ExternalLink, Home,
} from "lucide-react";

type Service = { name: string; description: string };
type Photo = { url: string; title?: string; location?: string; cost?: string };
type Review = {
  reviewerName: string; rating: number; text: string;
  jobType: string; location: string; verified: boolean; createdAt: string;
};
type Contractor = {
  slug: string; orgId: string; businessName: string; trade: string;
  tagline: string; phone: string; serviceArea: string; urgencyLine: string;
  yearsExperience: number; licenseText: string; photoUrl: string | null;
  services: Service[]; aboutBullets: { icon: string; text: string }[];
  photos: Photo[]; reviews: Review[];
  stats: { completedJobs: number; yearsExperience: number; avgRating: number | null; reviewCount: number };
};

const TABS = ["Overview", "Services", "Photos", "Reviews"] as const;
type Tab = typeof TABS[number];

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

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function QuoteModal({ slug, businessName, onClose }: { slug: string; businessName: string; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", description: "" });
  const [state, setState] = useState<"idle" | "submitting" | "done">("idle");
  const firstName = businessName.split(" ")[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    try {
      await fetch("/api/public/quote-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...form }),
      });
    } catch { /* show success anyway */ }
    setState("done");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-white rounded-t-3xl px-6 pt-4 pb-10 animate-in slide-in-from-bottom duration-300">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm">✕</button>

        {state === "done" ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Request Sent!</h3>
            <p className="text-sm text-gray-500 mb-6">{firstName} will get back to you within a few hours.</p>
            <button onClick={onClose} className="px-8 py-3 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: "#1B3A6B" }}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Get a Free Quote</h3>
              <p className="text-xs text-gray-400 mt-1">{firstName} will get back to you within a few hours</p>
            </div>
            {[
              { label: "Your Name", name: "name", type: "text", placeholder: "Jane Smith", required: true },
              { label: "Phone Number", name: "phone", type: "tel", placeholder: "(555) 000-0000", required: true },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                <input type={f.type} required={f.required} placeholder={f.placeholder}
                  value={(form as Record<string, string>)[f.name]}
                  onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">What do you need done?</label>
              <textarea required rows={3} placeholder="Describe your project…"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
            </div>
            <button type="submit" disabled={state === "submitting"}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: "#1B3A6B", opacity: state === "submitting" ? 0.7 : 1 }}>
              {state === "submitting" ? "Sending…" : "Send My Request"}
            </button>
            <p className="text-center text-[11px] text-gray-400">Free estimate · No obligation</p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ContractorPublicProfile({ contractor: c }: { contractor: Contractor }) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [quoteOpen, setQuoteOpen] = useState(false);

  const initials = c.businessName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-sm">
      {/* Top nav bar */}
      <header className="h-12 bg-white border-b border-gray-100 flex items-center px-4 gap-3 sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: "#1B3A6B" }}>
            <Home size={12} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm tracking-tight">TRADEBASE</span>
        </Link>
        <span className="text-gray-300 text-xs">/</span>
        <span className="text-xs text-gray-500 truncate">{c.businessName}</span>
        <div className="ml-auto">
          <button onClick={() => setQuoteOpen(true)}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: "#1B3A6B" }}>
            Get a Quote
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 flex gap-5">
        {/* ── Main column ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Profile header card */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {/* Banner */}
            <div className="h-36 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1B3A6B 0%, #0f2347 100%)" }}>
              {c.photoUrl && (
                <img src={c.photoUrl} alt="" className="w-full h-full object-cover opacity-20" />
              )}
              {/* Avatar */}
              <div className="absolute -bottom-9 left-5">
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: "#1B3A6B" }}>
                  {initials}
                </div>
              </div>
              {/* CTA */}
              <div className="absolute bottom-3 right-4">
                <button onClick={() => setQuoteOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg"
                  style={{ backgroundColor: "#F59E0B", color: "#1B3A6B" }}>
                  <MessageSquare size={14} /> Get a Free Quote
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="px-5 pt-12 pb-5">
              <div className="flex items-start gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{c.businessName}</h1>
                <CheckCircle size={18} fill="#1B3A6B" className="text-white shrink-0 mt-0.5" />
              </div>
              {c.trade && <p className="text-sm font-semibold text-blue-600 mb-1">{c.trade}</p>}
              {c.tagline && <p className="text-sm text-gray-500 leading-relaxed mb-3">{c.tagline}</p>}

              {/* Contact chips */}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-5">
                {c.serviceArea && <span className="flex items-center gap-1"><MapPin size={11} />{c.serviceArea}</span>}
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-blue-600 font-semibold">
                    <Phone size={11} />{c.phone}
                  </a>
                )}
                {c.licenseText && <span className="flex items-center gap-1"><Shield size={11} />{c.licenseText}</span>}
                {c.yearsExperience > 0 && <span className="flex items-center gap-1"><Clock size={11} />{c.yearsExperience} yrs experience</span>}
              </div>

              {/* Urgency line */}
              {c.urgencyLine && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-5 flex items-center gap-2">
                  <span className="text-amber-500 text-base">⚡</span>
                  <span className="text-xs font-semibold text-amber-800">{c.urgencyLine}</span>
                </div>
              )}

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: c.stats.completedJobs > 0 ? `${c.stats.completedJobs}+` : "—", label: "Jobs Done" },
                  { value: c.stats.yearsExperience > 0 ? `${c.stats.yearsExperience} yrs` : "—", label: "Experience" },
                  { value: c.stats.avgRating ? `${c.stats.avgRating} ★` : "—", label: "Avg Rating" },
                  { value: `${c.stats.reviewCount}`, label: "Reviews" },
                ].map(({ value, label }) => (
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
                      activeTab === t ? "" : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                    style={activeTab === t ? { borderColor: "#1B3A6B", color: "#1B3A6B" } : {}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Overview ── */}
          {activeTab === "Overview" && (
            <div className="space-y-4">
              {/* About */}
              {c.aboutBullets.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h2 className="font-bold text-gray-900 mb-4">About {c.businessName}</h2>
                  <div className="space-y-3">
                    {c.aboutBullets.map((b, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="text-lg shrink-0">{b.icon}</span>
                        <p className="text-sm text-gray-600 leading-relaxed">{b.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Featured review */}
              {c.reviews.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-900">What Customers Say</h2>
                    <button onClick={() => setActiveTab("Reviews")} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                      All reviews <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {c.reviews.slice(0, 2).map((r, i) => (
                      <div key={i} className={i > 0 ? "pt-4 border-t border-gray-100" : ""}>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
                            {r.reviewerName.slice(0, 1)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-sm text-gray-800">{r.reviewerName}</span>
                              {r.verified && <CheckCircle size={12} fill="#16A34A" className="text-white" />}
                              {r.jobType && <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{r.jobType}</span>}
                            </div>
                            <StarRating rating={r.rating} size={12} />
                            {r.text && <p className="text-sm text-gray-600 leading-relaxed italic mt-1.5">&ldquo;{r.text}&rdquo;</p>}
                            <p className="text-[10px] text-gray-400 mt-1">
                              {r.location && <span className="flex items-center gap-0.5 inline-flex"><MapPin size={9} />{r.location} · </span>}
                              {fmtDate(r.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Services preview */}
              {c.services.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-900">Services</h2>
                    <button onClick={() => setActiveTab("Services")} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                      See all <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.services.slice(0, 8).map((s, i) => (
                      <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{s.name}</span>
                    ))}
                    {c.services.length > 8 && (
                      <span className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-full text-xs">+{c.services.length - 8} more</span>
                    )}
                  </div>
                </div>
              )}

              {/* Photos preview */}
              {c.photos.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-900">Recent Work</h2>
                    <button onClick={() => setActiveTab("Photos")} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                      See all <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {c.photos.slice(0, 6).map((p, i) => (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                        <img src={p.url} alt={p.title ?? ""} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Services ── */}
          {activeTab === "Services" && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4">Services Offered</h2>
              {c.services.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No services listed yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {c.services.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#1B3A6B" + "20" }}>
                        <Wrench size={14} style={{ color: "#1B3A6B" }} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                        {s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Photos ── */}
          {activeTab === "Photos" && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4">Project Photos ({c.photos.length})</h2>
              {c.photos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No photos posted yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {c.photos.map((p, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100 group relative">
                      <img src={p.url} alt={p.title ?? ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      {p.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] text-white font-semibold">{p.title}</p>
                          {p.cost && <p className="text-[10px] text-white/70">{p.cost}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Reviews ── */}
          {activeTab === "Reviews" && (
            <div className="space-y-3">
              {/* Rating summary */}
              {c.stats.reviewCount > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-6">
                  <div className="text-center shrink-0">
                    <p className="text-4xl font-bold text-gray-900">{c.stats.avgRating}</p>
                    <StarRating rating={c.stats.avgRating ?? 0} size={16} />
                    <p className="text-xs text-gray-400 mt-1">{c.stats.reviewCount} review{c.stats.reviewCount !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex-1">
                    {[5, 4, 3, 2, 1].map(n => {
                      const count = c.reviews.filter(r => Math.round(r.rating) === n).length;
                      const pct = c.stats.reviewCount > 0 ? (count / c.stats.reviewCount) * 100 : 0;
                      return (
                        <div key={n} className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] text-gray-400 w-3 text-right">{n}</span>
                          <Star size={9} fill="#F59E0B" stroke="#F59E0B" />
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 w-4">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {c.reviews.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                  <p className="text-3xl mb-2">⭐</p>
                  <p className="font-semibold text-gray-700">No reviews yet</p>
                </div>
              ) : c.reviews.map((r, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
                      {r.reviewerName.slice(0, 1)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-bold text-sm text-gray-800">{r.reviewerName}</span>
                        {r.verified && <CheckCircle size={12} fill="#16A34A" className="text-white" />}
                        {r.jobType && <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{r.jobType}</span>}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <StarRating rating={r.rating} />
                        <span className="text-[10px] text-gray-400">{fmtDate(r.createdAt)}</span>
                        {r.location && <span className="text-[10px] text-gray-400">· {r.location}</span>}
                      </div>
                      {r.text && <p className="text-sm text-gray-600 leading-relaxed italic">&ldquo;{r.text}&rdquo;</p>}
                    </div>
                  </div>
                </div>
              ))}
              {/* Leave a review CTA */}
              <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
                <p className="text-xs text-gray-500 mb-3">Worked with {c.businessName}?</p>
                <a href={`/pro/${c.slug}/review`}
                  className="inline-block px-6 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: "#1B3A6B" }}>
                  ✍️ Leave a Review
                </a>
              </div>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-64 shrink-0 space-y-4">
          {/* CTA card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm text-center sticky top-16">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white mx-auto mb-3" style={{ backgroundColor: "#1B3A6B" }}>
              {initials}
            </div>
            <p className="font-bold text-gray-900 text-sm mb-0.5">{c.businessName}</p>
            {c.trade && <p className="text-xs text-blue-600 font-semibold mb-3">{c.trade}</p>}

            <button onClick={() => setQuoteOpen(true)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white mb-2"
              style={{ backgroundColor: "#1B3A6B" }}>
              Get a Free Quote
            </button>

            {c.phone && (
              <a href={`tel:${c.phone}`}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 flex items-center justify-center gap-2 hover:bg-gray-50">
                <Phone size={14} /> Call Now
              </a>
            )}

            {c.stats.reviewCount > 0 && c.stats.avgRating && (
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <StarRating rating={c.stats.avgRating} size={14} />
                <span className="text-xs font-bold text-gray-700">{c.stats.avgRating}</span>
                <span className="text-xs text-gray-400">({c.stats.reviewCount})</span>
              </div>
            )}
          </div>

          {/* About quick info */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Details</h3>
            <div className="space-y-2.5">
              {c.serviceArea && (
                <div className="flex gap-2">
                  <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-gray-400">Service Area</p>
                    <p className="text-xs font-semibold text-gray-700">{c.serviceArea}</p>
                  </div>
                </div>
              )}
              {c.yearsExperience > 0 && (
                <div className="flex gap-2">
                  <Award size={13} className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-gray-400">Experience</p>
                    <p className="text-xs font-semibold text-gray-700">{c.yearsExperience} years</p>
                  </div>
                </div>
              )}
              {c.licenseText && (
                <div className="flex gap-2">
                  <Shield size={13} className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-gray-400">License</p>
                    <p className="text-xs font-semibold text-gray-700">{c.licenseText}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Also see their pro page */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 mb-2">See their full website</p>
            <a href={`/pro/${c.slug}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
              <ExternalLink size={12} /> /pro/{c.slug}
            </a>
          </div>
        </div>
      </div>

      {/* Quote modal */}
      {quoteOpen && (
        <QuoteModal slug={c.slug} businessName={c.businessName} onClose={() => setQuoteOpen(false)} />
      )}
    </div>
  );
}
