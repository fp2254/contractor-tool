"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { ProjectDetail } from "@/app/find-contractors/mockData";

function TrustBadge({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg ${color}`}>
      {icon} {label}
    </span>
  );
}

function Img({ src, alt = "", className = "" }: { src: string; alt?: string; className?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  );
}

function BeforeAfterSlider({ beforeSrc, afterSrc }: { beforeSrc: string; afterSrc: string }) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function getPos(clientX: number) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setPosition(Math.round(x * 100));
  }

  useEffect(() => {
    function onMove(e: PointerEvent) { if (dragging.current) getPos(e.clientX); }
    function onUp() { dragging.current = false; }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden cursor-col-resize select-none touch-none"
      style={{ height: 260 }}
      onPointerDown={(e) => {
        dragging.current = true;
        getPos(e.clientX);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
    >
      {/* After photo — visible on right */}
      <img
        src={afterSrc}
        alt="After"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
      />
      {/* Before photo — clipped to left of slider */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img
          src={beforeSrc}
          alt="Before"
          className="absolute inset-0 h-full object-cover pointer-events-none"
          style={{ width: containerRef.current?.offsetWidth ?? 600 }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
        />
      </div>
      {/* Divider line */}
      <div
        className="absolute inset-y-0 w-0.5 bg-white pointer-events-none"
        style={{ left: `${position}%`, transform: "translateX(-50%)", boxShadow: "0 0 10px rgba(0,0,0,0.4)" }}
      />
      {/* Handle knob */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white border-2 border-gray-200 shadow-2xl flex items-center justify-center pointer-events-none z-10"
        style={{ left: `${position}%` }}
      >
        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-3 3 3 3M16 9l3 3-3 3" />
        </svg>
      </div>
      {/* Labels */}
      <div className="absolute top-3 left-3 pointer-events-none">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-black/50 text-white backdrop-blur-sm">Before</span>
      </div>
      <div className="absolute top-3 right-3 pointer-events-none">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-black/50 text-white backdrop-blur-sm">After</span>
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
        <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-black/40 text-white/90 backdrop-blur-sm whitespace-nowrap">
          ← Drag to compare →
        </span>
      </div>
    </div>
  );
}

export default function ProjectPageClient({ project: p }: { project: ProjectDetail }) {
  const [activePhoto, setActivePhoto] = useState(0);
  const [quoteOpen, setQuoteOpen] = useState(false);

  const afterPhoto = p.after_photo ?? p.photos[0];
  const beforePhoto = p.before_photo ?? p.photos[p.photos.length - 1];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Nav ── */}
      <header style={{ backgroundColor: "#1B3A6B" }} className="sticky top-0 z-40 shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/find-contractors" className="text-white/70 hover:text-white transition-colors flex items-center gap-1.5 text-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <span className="text-white/40">|</span>
          <Link href="/" className="text-white font-bold text-lg tracking-tight">🏠 TradeBase</Link>
          <div className="flex-1" />
          <span className="hidden md:block text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 text-blue-100">
            {p.trade}
          </span>
        </div>
      </header>

      {/* ── Hero Photo ── */}
      <div className="relative w-full bg-gray-900 overflow-hidden" style={{ height: "clamp(280px, 42vw, 480px)" }}>
        <div className={`absolute inset-0 bg-gradient-to-br ${p.cover_color}`} />
        <Img src={p.photos[activePhoto]} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {p.photos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {p.photos.map((photo, i) => (
              <button
                key={i}
                onClick={() => setActivePhoto(i)}
                className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all ${i === activePhoto ? "border-white scale-110" : "border-white/40 hover:border-white/70"}`}
              >
                <Img src={photo} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="absolute bottom-16 left-0 right-0 px-6 md:px-10">
          <div className="max-w-5xl mx-auto">
            <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm mb-2">{p.trade}</span>
            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-lg">{p.title}</h1>
            <p className="text-white/80 text-sm mt-1">📍 {p.location} · Completed {p.completed_date}</p>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-5xl mx-auto w-full px-4 md:px-6 py-8 flex flex-col lg:flex-row gap-8">

        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Duration", value: p.duration, icon: "⏱" },
              { label: "Completed", value: p.time_ago, icon: "✅" },
              { label: "Verified Projects", value: `${p.verified_projects}`, icon: "🔵" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                <p className="text-xl mb-1">{s.icon}</p>
                <p className="font-black text-slate-800 text-sm">{s.value}</p>
                <p className="text-[10px] text-gray-400 font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-bold text-slate-800 text-base mb-3">About This Project</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{p.description}</p>
          </div>

          {/* Before / After Slider */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Before / After</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">Drag the slider to reveal the transformation</p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                ✓ Real project photos
              </span>
            </div>
            <BeforeAfterSlider beforeSrc={beforePhoto} afterSrc={afterPhoto} />
          </div>

          {/* Scope of work */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-bold text-slate-800 text-base mb-3">Scope of Work</h2>
            <ul className="space-y-2">
              {p.scope.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Materials */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-bold text-slate-800 text-base mb-3">Materials Used</h2>
            <div className="flex flex-wrap gap-2">
              {p.materials.map((m, i) => (
                <span key={i} className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-slate-600">
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Customer Review */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex text-yellow-400 text-sm">{"★★★★★"}</div>
              <span className="text-xs font-bold text-slate-700">Verified Review</span>
              <span className="text-[10px] text-gray-400">via TradeBase</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed italic mb-3">"{p.customer_quote}"</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                {p.customer_name.charAt(0)}
              </div>
              <p className="text-xs font-semibold text-slate-600">{p.customer_name}</p>
            </div>
          </div>

        </div>

        {/* Right column — contractor card */}
        <div className="lg:w-80 flex-shrink-0 space-y-4">

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-20">
            <div className={`relative h-28 bg-gradient-to-br ${p.cover_color}`}>
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute -bottom-4 left-4 w-12 h-12 rounded-xl shadow-lg flex items-center justify-center text-white font-black text-lg" style={{ backgroundColor: p.avatar_color, border: "3px solid white" }}>
                {p.contractor_name.charAt(0)}
              </div>
            </div>
            <div className="pt-7 px-4 pb-4">
              <p className="font-black text-slate-800 text-base">{p.contractor_name}</p>
              <p className="text-xs text-gray-400 mb-3">{p.contractor_tagline}</p>

              <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400 text-sm">★</span>
                    <span className="text-sm font-black text-slate-800">{p.rating_google.toFixed(1)}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Google · {p.reviews_google} reviews</span>
                </div>
                {p.verified && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-blue-500 text-sm">★</span>
                      <span className="text-sm font-black text-slate-800">{p.rating_tb.toFixed(1)}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">TradeBase · {p.verified_projects} projects</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {p.verified && <TrustBadge icon="✓" label="TB Verified" color="bg-blue-50 text-blue-700" />}
                {p.licensed && <TrustBadge icon="🏛" label="Licensed" color="bg-green-50 text-green-700" />}
                {p.insured && <TrustBadge icon="🛡" label="Insured" color="bg-emerald-50 text-emerald-700" />}
                {p.veteran_owned && <TrustBadge icon="🎖" label="Veteran Owned" color="bg-amber-50 text-amber-700" />}
              </div>

              <button
                onClick={() => setQuoteOpen(true)}
                className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity mb-2"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                Request a Quote
              </button>
              <Link
                href={`/pro/${p.contractor_slug}`}
                className="block w-full rounded-xl py-3 text-sm font-bold text-center text-slate-600 border-2 border-gray-200 hover:border-blue-200 hover:text-blue-700 transition-colors"
              >
                View Full Profile
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-slate-700 mb-2">Similar Projects</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">Browse more {p.trade} projects completed by verified contractors in the Portland area.</p>
            <Link href="/find-contractors" className="mt-3 block text-center text-xs font-bold py-2 rounded-xl border border-gray-200 text-slate-600 hover:border-blue-200 hover:text-blue-700 transition-colors">
              Browse Projects →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Sticky bottom CTA (mobile) ── */}
      <div className="sticky bottom-0 md:hidden bg-white border-t border-gray-200 px-4 py-3 flex gap-3 shadow-lg">
        <Link href={`/pro/${p.contractor_slug}`}
          className="flex-1 rounded-xl py-3 text-center text-sm font-bold border-2 border-gray-200 text-slate-600">
          View Profile
        </Link>
        <button
          onClick={() => setQuoteOpen(true)}
          className="flex-1 rounded-xl py-3 text-sm font-bold text-white shadow-sm"
          style={{ backgroundColor: "#1B3A6B" }}
        >
          Request Quote
        </button>
      </div>

      {/* ── Quote Modal ── */}
      {quoteOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setQuoteOpen(false)} />
          <div className="fixed inset-x-4 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] z-50 bg-white rounded-2xl shadow-2xl p-6 pb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-slate-800">Request a Quote</p>
                <p className="text-xs text-gray-400">from {p.contractor_name}</p>
              </div>
              <button onClick={() => setQuoteOpen(false)} className="text-gray-400 text-xl leading-none hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-3">
              <input className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="Your name" />
              <input className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="Phone number" type="tel" />
              <input className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="Email address" type="email" />
              <textarea className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none" rows={3}
                placeholder={`Tell ${p.contractor_name} about your project…`} />
              <button
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#1B3A6B" }}
                onClick={() => setQuoteOpen(false)}
              >
                Send Quote Request
              </button>
              <p className="text-[10px] text-center text-gray-400">Free to request · No obligation · Verified contractor</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
