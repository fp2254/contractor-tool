"use client";

import { useState, useEffect, useRef } from "react";
import type { ContractorProfile } from "@/pro/[slug]/types";

const GOLD = "#F5A623";
const NAVY = "#0f1f3d";
const NAVY2 = "#1B3A6B";

/* ─── Quote Modal ─────────────────────────────────────────────────────────── */
function QuoteModal({ open, onClose, slug, name }: { open: boolean; onClose: () => void; slug: string; name: string }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", description: "" });
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    try {
      const res = await fetch("/api/public/quote-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...form }),
      });
      if (!res.ok) throw new Error();
      setState("success");
    } catch {
      setState("error");
    }
  }

  function close() { setState("idle"); setForm({ name: "", phone: "", email: "", address: "", description: "" }); onClose(); }

  const inp = "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:border-transparent bg-white";

  return (
    <div ref={overlayRef} onClick={e => e.target === overlayRef.current && close()}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {state === "success" ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#F0FDF4" }}>
              <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="#16A34A" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: NAVY }}>Request Sent!</h3>
            <p className="text-gray-500 text-sm mb-6">{name.split(" ")[0]} will be in touch within a few hours.</p>
            <button onClick={close} className="w-full py-3 rounded-xl text-white font-bold text-sm" style={{ background: GOLD }}>Done</button>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold" style={{ color: NAVY }}>Get a Free Quote</h3>
                <p className="text-xs text-gray-400 mt-0.5">Fast response · No obligation</p>
              </div>
              <button onClick={close} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
            </div>
            {state === "error" && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">Something went wrong — please try again.</div>
            )}
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Name *</label>
                  <input required className={inp} placeholder="John Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ focusRingColor: GOLD }} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Phone *</label>
                  <input required type="tel" className={inp} placeholder="(555) 000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Email</label>
                <input type="email" className={inp} placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Address / ZIP</label>
                <input className={inp} placeholder="123 Main St, Portland, ME 04101" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Project Description *</label>
                <textarea required rows={3} className={`${inp} resize-none`} placeholder="Describe your project..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <button type="submit" disabled={state === "submitting"} className="w-full py-3 rounded-xl text-white font-bold text-sm mt-1 disabled:opacity-60 transition-opacity"
                style={{ background: GOLD }}>
                {state === "submitting" ? "Sending…" : "Request My Free Quote →"}
              </button>
              <p className="text-center text-[10px] text-gray-400">Free estimates · No obligation · Secure & Private</p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Service icon (simple gold SVG) ─────────────────────────────────────── */
function ServiceIcon({ index }: { index: number }) {
  const icons = [
    // Wrench / plumbing
    <svg key={0} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
    // Lightning / electrical
    <svg key={1} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
    // Flame / heating
    <svg key={2} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z"/></svg>,
    // Tools / maintenance
    <svg key={3} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/><path d="M9 9H4v5l3 3 3-3V9z" stroke={GOLD}/></svg>,
    // House / roofing
    <svg key={4} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg>,
    // Leaf / landscaping
    <svg key={5} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><path d="M17 8C8 10 5.9 16.17 3.82 19.03c-.86 1.19.21 2.67 1.55 2.1C9 19.4 14.68 17.44 17 8z"/><path d="M17 8C19 4 16 2 12 2c0 5-2 7-6 8"/></svg>,
  ];
  return icons[index % icons.length];
}

/* ─── Stars ───────────────────────────────────────────────────────────────── */
function Stars({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="w-4 h-4" fill={i < count ? GOLD : "#D1D5DB"}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </div>
  );
}

/* ─── Section heading ─────────────────────────────────────────────────────── */
function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-10">
      <h2 className="text-3xl font-bold mb-2" style={{ color: NAVY }}>{title}</h2>
      <div className="w-12 h-0.5 mx-auto mb-3" style={{ background: GOLD }} />
      {subtitle && <p className="text-gray-500 text-sm max-w-md mx-auto">{subtitle}</p>}
    </div>
  );
}

/* ─── Main Template ───────────────────────────────────────────────────────── */
export function ClassicContractorTemplate({ profile }: { profile: ContractorProfile }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setHeaderScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); setMenuOpen(false); }
  }

  const {
    name, trade, tagline, phoneFormatted, phone,
    services, photos, reviews, about,
    trustItems, serviceArea, photoUrl,
    rating, reviewCount, sectionsConfig,
  } = profile;

  const showServices = sectionsConfig.services !== false && services.length > 0;
  const showAbout    = sectionsConfig.about    !== false && about.length > 0;
  const showGallery  = sectionsConfig.gallery  !== false && photos.length > 0;
  const showReviews  = sectionsConfig.reviews  !== false && reviews.length > 0;

  const heroImage = photos[0]?.url || photoUrl || null;
  const currentReview = reviews[reviewIdx];

  const navLinks = [
    { label: "Home",      id: "hero" },
    showServices && { label: "Services", id: "services" },
    showAbout    && { label: "About",    id: "about" },
    showGallery  && { label: "Projects", id: "projects" },
    showReviews  && { label: "Reviews",  id: "reviews" },
    { label: "Contact",   id: "contact" },
  ].filter(Boolean) as { label: string; id: string }[];

  /* ── Header ────────────────────────────────────────────────────────────── */
  const Header = (
    <header
      id="hero"
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-200"
      style={{
        background: headerScrolled ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.96)",
        boxShadow: headerScrolled ? "0 2px 16px rgba(0,0,0,0.10)" : "0 1px 0 #e5e7eb",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-16">
        {/* Logo */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt={name} className="w-9 h-9 rounded object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded flex items-center justify-center shrink-0" style={{ background: NAVY }}>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate" style={{ color: NAVY }}>{name}</p>
            {trade && <p className="text-[10px] text-gray-400 leading-tight truncate">{trade}</p>}
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(l => (
            <button key={l.id} onClick={() => scrollTo(l.id)}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              {l.label}
            </button>
          ))}
        </nav>

        {/* CTA + Mobile Menu */}
        <div className="flex items-center gap-3">
          <button onClick={() => setQuoteOpen(true)}
            className="px-4 py-2 rounded text-white text-sm font-bold hidden sm:block transition-opacity hover:opacity-90"
            style={{ background: GOLD }}>
            GET A QUOTE →
          </button>
          {phone && (
            <a href={phone} className="hidden lg:flex items-center gap-1.5 text-sm font-semibold" style={{ color: NAVY }}>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.51 12 19.79 19.79 0 011.44 3.4 2 2 0 013.42 1.22h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {phoneFormatted}
            </a>
          )}
          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(m => !m)} className="md:hidden p-2 rounded" style={{ color: NAVY }}>
            {menuOpen
              ? <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
              : <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round"/></svg>
            }
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-5 py-4 space-y-1">
          {navLinks.map(l => (
            <button key={l.id} onClick={() => scrollTo(l.id)}
              className="block w-full text-left py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900">
              {l.label}
            </button>
          ))}
          <button onClick={() => { setMenuOpen(false); setQuoteOpen(true); }}
            className="block w-full mt-3 py-3 rounded text-white font-bold text-sm text-center"
            style={{ background: GOLD }}>
            Get a Free Quote →
          </button>
        </div>
      )}
    </header>
  );

  /* ── Hero ──────────────────────────────────────────────────────────────── */
  const Hero = (
    <section className="pt-16" style={{ background: NAVY, minHeight: 480 }}>
      <div className="max-w-6xl mx-auto px-5 flex flex-col md:flex-row items-stretch min-h-[420px] md:min-h-[520px]">
        {/* Left: Text */}
        <div className="flex-1 py-14 md:py-20 flex flex-col justify-center pr-0 md:pr-12">
          {/* Tagline line */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: GOLD }}>
              {trade ? `${trade}. ${serviceArea || "Local"}.` : `Reliable. Professional. ${serviceArea || "Local"}.`}
            </span>
            <div className="flex-1 h-px max-w-[60px]" style={{ background: GOLD }} />
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
            {tagline || <>Quality Work.<br />Built on{" "}<span style={{ color: GOLD }}>Trust.</span></>}
          </h1>

          {/* Description */}
          <p className="text-gray-300 text-base mb-8 max-w-md leading-relaxed">
            {profile.urgencyLine || "Honest pricing. Top-quality service. Results that last."}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mb-10">
            <button onClick={() => setQuoteOpen(true)}
              className="px-6 py-3 rounded font-bold text-sm transition-opacity hover:opacity-90 flex items-center gap-1.5"
              style={{ background: GOLD, color: NAVY }}>
              REQUEST A FREE QUOTE →
            </button>
            {showServices && (
              <button onClick={() => scrollTo("services")}
                className="px-6 py-3 rounded font-bold text-sm border-2 text-white hover:bg-white/10 transition-colors"
                style={{ borderColor: "rgba(255,255,255,0.4)" }}>
                OUR SERVICES
              </button>
            )}
          </div>

          {/* Trust badges */}
          {trustItems.length > 0 ? (
            <div className="flex flex-wrap gap-5">
              {trustItems.slice(0, 3).map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <span style={{ color: GOLD }}>{t.icon}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-300">{t.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-6">
              {["Licensed & Insured", "Quality Guarantee", "On-Time Every Time"].map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke={GOLD} strokeWidth="2">
                    {i === 0 && <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round"/>}
                    {i === 1 && <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" strokeLinecap="round" strokeLinejoin="round"/>}
                    {i === 2 && <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round"/></>}
                  </svg>
                  <span className="text-xs font-semibold text-gray-300">{b}</span>
                </div>
              ))}
            </div>
          )}

          {/* Rating bar */}
          {rating > 0 && reviewCount > 0 && (
            <div className="flex items-center gap-2 mt-6">
              <Stars count={Math.round(rating)} />
              <span className="text-xs text-gray-300 font-medium">{rating.toFixed(1)} · {reviewCount} review{reviewCount !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* Right: Hero image */}
        <div className="hidden md:flex flex-col justify-end w-[42%] shrink-0 relative overflow-hidden">
          {heroImage ? (
            <img src={heroImage} alt={name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1B3A6B 0%, #0f1f3d 100%)" }}>
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: "radial-gradient(circle at 30% 70%, rgba(245,166,35,0.4) 0%, transparent 60%)"
              }} />
            </div>
          )}
          {/* Logo overlay box */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white rounded-lg px-6 py-4 shadow-xl text-center min-w-[160px]">
            {photoUrl ? (
              <img src={photoUrl} alt={name} className="w-10 h-10 object-cover rounded mx-auto mb-1" />
            ) : (
              <div className="w-10 h-10 rounded flex items-center justify-center mx-auto mb-1" style={{ background: NAVY }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            )}
            <p className="text-xs font-bold" style={{ color: NAVY }}>{name}</p>
            {trade && <p className="text-[10px] text-gray-400">{trade}</p>}
          </div>
        </div>
      </div>
    </section>
  );

  /* ── Services ──────────────────────────────────────────────────────────── */
  const Services = showServices && (
    <section id="services" className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-5">
        <SectionHeading title="Our Services" subtitle="Professional solutions for your home or business." />
        <div className={`grid gap-6 ${services.length <= 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto" : services.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
          {services.map((s, i) => (
            <div key={i} className="text-center p-6 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white group">
              <div className="flex justify-center mb-4 group-hover:scale-110 transition-transform">
                <ServiceIcon index={i} />
              </div>
              <h3 className="font-bold text-base mb-2" style={{ color: NAVY }}>{s.name}</h3>
              {s.description && <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>}
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <button onClick={() => setQuoteOpen(true)}
            className="px-8 py-3 rounded font-bold text-sm transition-opacity hover:opacity-90"
            style={{ background: GOLD, color: NAVY }}>
            REQUEST A FREE QUOTE →
          </button>
        </div>
      </div>
    </section>
  );

  /* ── About ─────────────────────────────────────────────────────────────── */
  const aboutImage = photos[1]?.url || photos[0]?.url || null;
  const About = showAbout && (
    <section id="about" className="py-16" style={{ background: "#F8F9FA" }}>
      <div className="max-w-6xl mx-auto px-5">
        <div className="flex flex-col md:flex-row items-center gap-12">
          {/* Text */}
          <div className="flex-1">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>ABOUT US</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight" style={{ color: NAVY }}>
              Local. Reliable.<br />Professional.
            </h2>
            {profile.urgencyLine && (
              <p className="text-gray-600 mb-6 leading-relaxed text-sm max-w-md">
                We&apos;re a team of skilled professionals committed to delivering top-quality work with honesty and integrity. Your satisfaction is our priority.
              </p>
            )}
            {/* Bullets */}
            <ul className="space-y-3 mb-8">
              {about.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: GOLD }}>
                    <svg viewBox="0 0 12 10" className="w-2.5 h-2" fill="none"><path d="M1 5l3 3 7-7" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{b.icon} {b.text}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => setQuoteOpen(true)}
              className="px-6 py-2.5 rounded font-bold text-sm border-2 transition-colors hover:text-white"
              style={{ borderColor: GOLD, color: GOLD, background: "transparent" }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = GOLD; (e.target as HTMLElement).style.color = NAVY; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = "transparent"; (e.target as HTMLElement).style.color = GOLD; }}>
              LEARN MORE ABOUT US →
            </button>
          </div>
          {/* Image */}
          <div className="flex-1 w-full md:max-w-md">
            {aboutImage ? (
              <img src={aboutImage} alt="About" className="w-full h-64 md:h-80 object-cover rounded-xl shadow-md" />
            ) : (
              <div className="w-full h-64 md:h-80 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY2} 100%)` }}>
                <svg viewBox="0 0 24 24" className="w-16 h-16 opacity-30" fill="none" stroke="white" strokeWidth="1.5"><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" strokeLinecap="round"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" strokeLinecap="round"/></svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  /* ── Projects ──────────────────────────────────────────────────────────── */
  const Projects = showGallery && (
    <section id="projects" className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-5">
        <SectionHeading title="Recent Projects" subtitle="See our work across the region." />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
          {photos.slice(0, 6).map((p, i) => (
            <button key={i} onClick={() => setLightbox(p.url)}
              className={`relative overflow-hidden rounded-lg group ${i === 1 ? "sm:row-span-1" : ""}`}
              style={{ aspectRatio: i === 1 ? "4/3" : "4/3" }}>
              <img src={p.url} alt={p.title || `Project ${i + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              {(p.title || p.location) && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {p.title && <p className="text-white text-xs font-bold">{p.title}</p>}
                  {p.location && <p className="text-white/80 text-[10px]">{p.location}</p>}
                </div>
              )}
            </button>
          ))}
        </div>
        {photos.length > 6 && (
          <div className="text-center mt-8">
            <button className="px-8 py-2.5 rounded border-2 font-bold text-sm transition-colors hover:bg-gray-50"
              style={{ borderColor: "#D1D5DB", color: "#374151" }}>
              VIEW MORE PROJECTS →
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 cursor-pointer"
          style={{ background: "rgba(0,0,0,0.9)" }}>
          <img src={lightbox} alt="Project" className="max-w-full max-h-full rounded-lg object-contain" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
          </button>
        </div>
      )}
    </section>
  );

  /* ── Reviews ───────────────────────────────────────────────────────────── */
  const Reviews = showReviews && currentReview && (
    <section id="reviews" className="py-16" style={{ background: "#F8F9FA" }}>
      <div className="max-w-3xl mx-auto px-5 text-center">
        {/* Giant quote mark */}
        <div className="text-8xl font-serif leading-none mb-2" style={{ color: GOLD }}>&ldquo;</div>
        <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-6 font-medium max-w-2xl mx-auto">
          {currentReview.text}
        </p>
        <div className="flex justify-center mb-3">
          <Stars count={currentReview.stars} />
        </div>
        <p className="font-bold text-sm" style={{ color: NAVY }}>— {currentReview.name}</p>
        {currentReview.jobType && <p className="text-xs text-gray-400 mt-1">{currentReview.jobType}{currentReview.location ? ` · ${currentReview.location}` : ""}</p>}

        {/* Prev / Next */}
        {reviews.length > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button onClick={() => setReviewIdx(i => (i - 1 + reviews.length) % reviews.length)}
              className="w-9 h-9 rounded-full border-2 flex items-center justify-center transition-colors hover:bg-white"
              style={{ borderColor: "#D1D5DB" }}>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#374151" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div className="flex gap-1.5">
              {reviews.map((_, i) => (
                <button key={i} onClick={() => setReviewIdx(i)}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ background: i === reviewIdx ? GOLD : "#D1D5DB", width: i === reviewIdx ? 20 : 6 }} />
              ))}
            </div>
            <button onClick={() => setReviewIdx(i => (i + 1) % reviews.length)}
              className="w-9 h-9 rounded-full border-2 flex items-center justify-center transition-colors hover:bg-white"
              style={{ borderColor: "#D1D5DB" }}>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#374151" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );

  /* ── CTA Strip ─────────────────────────────────────────────────────────── */
  const CTAStrip = (
    <section id="contact" className="py-10" style={{ background: NAVY }}>
      <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Clipboard icon */}
          <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(245,166,35,0.15)", border: `1px solid ${GOLD}40` }}>
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Ready to get started?</h3>
            <p className="text-gray-400 text-sm mt-0.5">Let&apos;s talk about your project. Fast, easy, and hassle-free.</p>
          </div>
        </div>
        <button onClick={() => setQuoteOpen(true)}
          className="px-8 py-3 rounded font-bold text-sm whitespace-nowrap shrink-0 transition-opacity hover:opacity-90"
          style={{ background: GOLD, color: NAVY }}>
          REQUEST A FREE QUOTE →
        </button>
      </div>
    </section>
  );

  /* ── Footer ────────────────────────────────────────────────────────────── */
  const Footer = (
    <footer style={{ background: "#0a1628" }}>
      <div className="max-w-6xl mx-auto px-5 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            {photoUrl ? (
              <img src={photoUrl} alt={name} className="w-8 h-8 rounded object-cover" />
            ) : (
              <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: NAVY2 }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            )}
            <span className="font-bold text-white text-sm">{name}</span>
          </div>
          <p className="text-gray-500 text-xs leading-relaxed mb-4">
            Proudly serving our community with reliable, top-quality service.{serviceArea ? ` Serving ${serviceArea}.` : ""}
          </p>
          {/* Social placeholders */}
          <div className="flex gap-2">
            {["f", "in", "tw", "yt"].map((s, i) => (
              <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-400 cursor-pointer hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.06)" }}>
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Services col */}
        {showServices && (
          <div>
            <h4 className="text-white font-bold text-sm mb-4">SERVICES</h4>
            <ul className="space-y-2">
              {services.map((s, i) => (
                <li key={i}>
                  <button onClick={() => scrollTo("services")} className="text-gray-500 text-xs hover:text-gray-300 transition-colors text-left">
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick links */}
        <div>
          <h4 className="text-white font-bold text-sm mb-4">QUICK LINKS</h4>
          <ul className="space-y-2">
            {[
              { label: "About Us", id: "about" },
              { label: "Projects", id: "projects" },
              { label: "Reviews", id: "reviews" },
              { label: "Service Area", id: "contact" },
              { label: "Get a Quote", id: "contact" },
            ].filter(l => navLinks.some(n => n.id === l.id) || l.label === "Get a Quote").map((l, i) => (
              <li key={i}>
                <button onClick={() => l.label === "Get a Quote" ? setQuoteOpen(true) : scrollTo(l.id)}
                  className="text-gray-500 text-xs hover:text-gray-300 transition-colors">
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-white font-bold text-sm mb-4">CONTACT US</h4>
          <ul className="space-y-3">
            {phoneFormatted && (
              <li className="flex items-start gap-2">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke={GOLD} strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.51 12 19.79 19.79 0 011.44 3.4 2 2 0 013.42 1.22h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <a href={phone} className="text-gray-400 text-xs hover:text-gray-200 transition-colors">{phoneFormatted}</a>
              </li>
            )}
            {serviceArea && (
              <li className="flex items-start gap-2">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke={GOLD} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span className="text-gray-400 text-xs">{serviceArea}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5 py-4">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-gray-600 text-[11px]">© {new Date().getFullYear()} {name}. All rights reserved.</p>
          <p className="text-gray-700 text-[11px]">Powered by <span className="text-gray-500 font-semibold">TradeBase</span></p>
        </div>
      </div>
    </footer>
  );

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: NAVY }}>
      {Header}
      {Hero}
      {Services}
      {About}
      {Projects}
      {Reviews}
      {CTAStrip}
      {Footer}

      <QuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        slug={profile.slug}
        name={profile.name}
      />
    </div>
  );
}
