"use client";

import { useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Star,
  Shield,
  Award,
  CheckCircle2,
  ArrowRight,
  Wrench,
  User,
} from "lucide-react";
import type { ContractorProfile } from "@/app/pro/[slug]/types";
import { SharedQuoteModal } from "./SharedQuoteModal";

// Maps trustBar icon strings to lucide components
const trustBarIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  award: Award,
  shield: Shield,
  star: Star,
  check: CheckCircle2,
};

type LogoMarkProps = {
  logoUrl: string | null | undefined;
  logoMark: string;
  businessName: string;
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
};

function LogoMark({ logoUrl, logoMark, businessName, size = "md", variant = "dark" }: LogoMarkProps) {
  const sizeClasses = {
    sm: "w-10 h-10 text-base",
    md: "w-12 h-12 text-xl",
    lg: "w-14 h-14 text-2xl",
  };
  const variantClasses = {
    dark: "bg-slate-900 text-amber-400",
    light: "bg-amber-400 text-slate-900",
  };

  if (logoUrl) {
    return (
      <div className={`${sizeClasses[size]} bg-white rounded overflow-hidden flex-shrink-0 grid place-items-center p-1 border border-stone-200 shadow-sm`}>
        <img
          src={logoUrl}
          alt={`${businessName} logo`}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} ${variantClasses[variant]} grid place-items-center font-serif font-bold rounded flex-shrink-0`}>
      {logoMark}
    </div>
  );
}

// ─── Data mapping: ContractorProfile → template data shape ─────────────────

function buildData(profile: ContractorProfile) {
  const initials = profile.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "TB";

  const certifications: string[] = [];
  if (profile.licenseNumber) certifications.push(profile.licenseNumber);
  profile.trustItems.slice(0, 3).forEach((t) => certifications.push(t.text));
  if (!certifications.length) {
    certifications.push("Licensed Contractor", "Fully Insured");
  }

  const aboutStory =
    profile.about.length > 0
      ? profile.about.map((a) => a.text).join(" ")
      : `${profile.name} is a trusted ${profile.trade || "contractor"} serving ${profile.location || "the local area"}. We take pride in every job we do.`;

  const serviceAreas = profile.serviceArea
    ? profile.serviceArea.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  if (!serviceAreas.length) serviceAreas.push(profile.location || "Local Area");

  const trustBarData =
    profile.trustItems.length > 0
      ? profile.trustItems.slice(0, 4).map((item, i) => {
          const icons = ["award", "shield", "star", "check"];
          return { icon: icons[i] || "check", label: item.text };
        })
      : [
          { icon: "award", label: "Licensed & Certified" },
          { icon: "shield", label: "Fully Insured" },
          {
            icon: "star",
            label: `${profile.rating > 0 ? profile.rating.toFixed(1) : "5.0"}/5 · ${profile.reviewCount}+ Reviews`,
          },
          { icon: "check", label: "Local & Trusted" },
        ];

  const trustPoints =
    profile.trustItems.length > 0
      ? profile.trustItems.slice(0, 3).map((t) => t.text)
      : [
          "Fully Licensed · Insured · Certified",
          "Free estimates, transparent pricing",
          "Fast scheduling, quality work",
        ];

  return {
    business: {
      name: profile.name || "Your Business Name",
      tagline: profile.tagline || "Quality Work You Can Trust",
      logoUrl: profile.photoUrl ?? null,
      logoMark: initials,
      phone: profile.phoneFormatted || "",
      email: "",
      address: profile.serviceArea || profile.location || "",
      hours: profile.urgencyLine || "",
    },
    hero: {
      badge:
        profile.stats.yearsExperience > 0
          ? `${profile.stats.yearsExperience}+ Years Serving Local Families`
          : profile.trade || "Local Contractor",
      headline: profile.tagline || "Quality Work You Can Trust",
      subhead:
        profile.about.length > 0
          ? profile.about[0].text
          : "Professional service from a team that treats every job like it matters — because it does.",
      trustPoints,
      primaryCtaText: "Call Now",
      secondaryCtaText: "Request a Quote",
      backgroundImage: null as string | null,
    },
    trustBar: trustBarData,
    sections: {
      services: {
        eyebrow: "What We Do",
        title: "Services We Offer",
        subtitle: "Honest work, clear pricing, and the experience to get it right the first time.",
      },
      about: {
        eyebrow: "About Us",
        title: "Family-Owned. Locally Trusted.",
      },
      reviews: {
        eyebrow: "Real Customers · Real Results",
        title: "What Our Customers Say",
        ratingSummary:
          profile.reviewCount > 0
            ? `${profile.rating.toFixed(1)} average · ${profile.reviewCount} verified review${profile.reviewCount !== 1 ? "s" : ""}`
            : "5.0 average · verified reviews",
      },
      serviceAreas: {
        eyebrow: "Service Areas",
        title: "Areas We Proudly Serve",
        subtitle:
          "If you're in our area, we've got you covered. Don't see your town? Give us a call — we travel for the right job.",
        ctaText: "Ask About Your Area",
      },
      gallery: {
        eyebrow: "Our Work",
        title: "Recent Projects",
        subtitle: "A few examples of work we are proud of.",
      },
      finalCta: {
        title: "Ready to Get Started?",
        subtitle: "Free phone consultation. No pressure, just answers.",
        callButtonText: "Call",
      },
    },
    services:
      profile.services.length > 0
        ? profile.services.map((s) => ({ name: s.name, description: s.description, image: s.photo_url || null as string | null }))
        : [
            { name: "Service One", description: "Contact us for details on this service.", image: null },
            { name: "Service Two", description: "Contact us for details on this service.", image: null },
          ],
    about: {
      story: aboutStory,
      yearsInBusiness: profile.stats.yearsExperience || 0,
      homesServed:
        profile.stats.jobsCompleted > 0
          ? `${profile.stats.jobsCompleted}+`
          : profile.stats.revenue || "100+",
      avgRating: profile.rating > 0 ? `${profile.rating.toFixed(1)}★` : "5.0★",
      certifications,
      ownerName: profile.name,
      ownerQuote: profile.tagline ? `"${profile.tagline}"` : '"We treat every job like it\'s our own home."',
      ownerPhoto: profile.photoUrl ?? null,
    },
    reviews:
      profile.reviews.length > 0
        ? profile.reviews.slice(0, 3).map((r) => ({
            name: r.name,
            rating: r.stars,
            text: r.text,
            date: "",
            location: r.location || "",
          }))
        : [],
    serviceAreas,
    gallery: profile.photos.map((p) => ({ src: p.url, alt: p.title, caption: p.title })),
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ClassicContractorTemplate({ profile }: { profile: ContractorProfile }) {
  const [modalOpen, setModalOpen] = useState(false);
  const data = buildData(profile);
  const phoneHref = profile.phone || `tel:${data.business.phone.replace(/[^0-9+]/g, "")}`;

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-slate-900 antialiased">
      {/* ============ TOP BAR ============ */}
      <div className="bg-slate-900 text-stone-100 text-xs sm:text-sm">
        <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
          <div className="flex items-center gap-2">
            {data.business.hours && (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-stone-300">{data.business.hours}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {phoneHref && (
              <a
                href={phoneHref}
                className="flex items-center gap-1.5 font-semibold text-amber-400 hover:text-amber-300 transition"
              >
                <Phone className="w-3.5 h-3.5" />
                {data.business.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ============ HEADER / NAV ============ */}
      <header className="bg-white border-b-2 border-slate-900 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMark
              logoUrl={data.business.logoUrl}
              logoMark={data.business.logoMark}
              businessName={data.business.name}
              size="md"
              variant="dark"
            />
            <div>
              <div className="font-serif text-lg sm:text-xl font-bold leading-tight">
                {data.business.name}
              </div>
              <div className="text-xs text-slate-600 hidden sm:block">
                {data.business.tagline}
              </div>
            </div>
          </div>
          {phoneHref && (
            <a
              href={phoneHref}
              className="hidden md:inline-flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white px-5 py-2.5 rounded font-semibold transition shadow-sm"
            >
              <Phone className="w-4 h-4" />
              {data.hero.primaryCtaText}
            </a>
          )}
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative bg-slate-900 text-stone-100 overflow-hidden">
        {data.hero.backgroundImage && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{ backgroundImage: `url('${data.hero.backgroundImage}')` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900/70" />

        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24 lg:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 text-amber-400 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider mb-6">
              <Shield className="w-3.5 h-3.5" />
              {data.hero.badge}
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-5">
              {data.hero.headline}
            </h1>

            <p className="text-lg text-stone-300 mb-8 leading-relaxed max-w-xl">
              {data.hero.subhead}
            </p>

            <ul className="space-y-2.5 mb-9 text-stone-200">
              {data.hero.trustPoints.map((point, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm sm:text-base">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  {point}
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3">
              {phoneHref && (
                <a
                  href={phoneHref}
                  className="inline-flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 text-white px-6 py-4 rounded font-bold text-lg transition shadow-lg"
                >
                  <Phone className="w-5 h-5" />
                  {data.hero.primaryCtaText} {data.business.phone}
                </a>
              )}
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-stone-100 text-slate-900 px-6 py-4 rounded font-bold text-lg transition shadow-lg"
              >
                {data.hero.secondaryCtaText}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom trust bar */}
        <div className="relative bg-slate-950 border-t border-slate-800">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap justify-around items-center gap-4 text-stone-300 text-sm">
            {data.trustBar.map((item, i) => {
              const Icon = trustBarIcons[item.icon] || CheckCircle2;
              return (
                <div key={i} className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 text-amber-400 ${item.icon === "star" ? "fill-amber-400" : ""}`} />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ SERVICES ============ */}
      {data.services.length > 0 && (
        <section id="services" className="py-16 sm:py-24 bg-stone-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-block text-red-700 font-semibold text-sm uppercase tracking-widest mb-2">
                {data.sections.services.eyebrow}
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                {data.sections.services.title}
              </h2>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                {data.sections.services.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {data.services.map((service, i) => (
                <div
                  key={i}
                  className="bg-white border border-stone-200 rounded-lg overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="aspect-video overflow-hidden bg-stone-200">
                    {service.image ? (
                      <img
                        src={service.image}
                        alt={service.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center bg-stone-200 text-stone-400">
                        <Wrench className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-slate-900 text-amber-400 rounded grid place-items-center">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <h3 className="font-serif text-xl font-bold">{service.name}</h3>
                    </div>
                    {service.description && (
                      <p className="text-slate-600 text-sm leading-relaxed mb-4">{service.description}</p>
                    )}
                    {phoneHref && (
                      <a
                        href={phoneHref}
                        className="inline-flex items-center gap-1 text-red-700 hover:text-red-800 font-semibold text-sm"
                      >
                        Get a quote
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ ABOUT / TRUST ============ */}
      <section id="about" className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              {data.about.ownerPhoto ? (
                <img
                  src={data.about.ownerPhoto}
                  alt={data.about.ownerName}
                  className="w-full rounded-lg shadow-2xl"
                />
              ) : (
                <div className="w-full aspect-[4/5] bg-stone-200 rounded-lg shadow-2xl grid place-items-center text-stone-400">
                  <User className="w-24 h-24" />
                </div>
              )}
              <div className="mt-4 flex items-center gap-3 bg-stone-100 p-4 rounded-lg border-l-4 border-red-700">
                <div className="font-serif italic text-lg">{data.about.ownerQuote}</div>
              </div>
              <div className="mt-2 text-sm text-slate-600 font-semibold">— {data.about.ownerName}</div>
            </div>

            <div>
              <div className="inline-block text-red-700 font-semibold text-sm uppercase tracking-widest mb-2">
                {data.sections.about.eyebrow}
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                {data.sections.about.title}
              </h2>
              <p className="text-slate-700 text-lg leading-relaxed mb-8">{data.about.story}</p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8 border-t border-b border-stone-200 py-6">
                {data.about.yearsInBusiness > 0 && (
                  <div className="text-center">
                    <div className="font-serif text-3xl sm:text-4xl font-bold text-red-700">
                      {data.about.yearsInBusiness}+
                    </div>
                    <div className="text-xs uppercase tracking-wider text-slate-600 mt-1">Years</div>
                  </div>
                )}
                <div className="text-center border-x border-stone-200">
                  <div className="font-serif text-3xl sm:text-4xl font-bold text-red-700">
                    {data.about.homesServed}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-slate-600 mt-1">{profile.statLabel || "Customers"}</div>
                </div>
                <div className="text-center">
                  <div className="font-serif text-3xl sm:text-4xl font-bold text-red-700">
                    {data.about.avgRating}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-slate-600 mt-1">Avg Rating</div>
                </div>
              </div>

              {/* Certifications */}
              {data.about.certifications.length > 0 && (
                <div>
                  <div className="font-semibold text-sm uppercase tracking-widest text-slate-600 mb-3">
                    Certifications &amp; Licenses
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.about.certifications.map((cert, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 bg-stone-100 border border-stone-300 px-3 py-1.5 rounded text-sm font-medium"
                      >
                        <Shield className="w-3.5 h-3.5 text-red-700" />
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============ REVIEWS ============ */}
      {data.reviews.length > 0 && (
        <section className="py-16 sm:py-24 bg-slate-900 text-stone-100">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-block text-amber-400 font-semibold text-sm uppercase tracking-widest mb-2">
                {data.sections.reviews.eyebrow}
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                {data.sections.reviews.title}
              </h2>
              <div className="flex items-center justify-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <span className="text-stone-300 text-sm">{data.sections.reviews.ratingSummary}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.reviews.map((review, i) => (
                <div
                  key={i}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-amber-400/50 transition"
                >
                  <div className="flex mb-3">
                    {[...Array(review.rating)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-stone-200 leading-relaxed mb-5 text-sm sm:text-base">
                    &ldquo;{review.text}&rdquo;
                  </p>
                  <div className="border-t border-slate-700 pt-4">
                    <div className="font-bold text-stone-100">{review.name}</div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {[review.location, review.date].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ SERVICE AREAS ============ */}
      {data.serviceAreas.length > 0 && (
        <section className="py-16 sm:py-24 bg-stone-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-block text-red-700 font-semibold text-sm uppercase tracking-widest mb-2">
                  {data.sections.serviceAreas.eyebrow}
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 leading-tight">
                  {data.sections.serviceAreas.title}
                </h2>
                <p className="text-slate-600 text-lg leading-relaxed mb-8">
                  {data.sections.serviceAreas.subtitle}
                </p>
                {phoneHref && (
                  <a
                    href={phoneHref}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded font-bold transition shadow"
                  >
                    <Phone className="w-4 h-4" />
                    {data.sections.serviceAreas.ctaText}
                  </a>
                )}
              </div>

              <div className="bg-white border border-stone-200 rounded-lg p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <MapPin className="w-5 h-5 text-red-700" />
                  <span className="font-semibold uppercase tracking-wider text-sm text-slate-700">
                    Areas We Serve
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {data.serviceAreas.map((area, i) => (
                    <div key={i} className="flex items-center gap-2 text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-red-700 flex-shrink-0" />
                      <span className="text-sm sm:text-base">{area}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============ GALLERY ============ */}
      {data.gallery.length > 0 && (
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-block text-red-700 font-semibold text-sm uppercase tracking-widest mb-2">
                {data.sections.gallery.eyebrow}
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                {data.sections.gallery.title}
              </h2>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                {data.sections.gallery.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {data.gallery.map((photo, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-lg group cursor-pointer bg-stone-200"
                >
                  {photo.src ? (
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-stone-400">
                      <Wrench className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 sm:p-4">
                    <div className="text-white text-xs sm:text-sm font-semibold">{photo.caption}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ FINAL CTA / QUOTE ============ */}
      <section
        id="quote"
        className="relative py-16 sm:py-24 bg-red-700 text-white overflow-hidden"
      >
        {data.hero.backgroundImage && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-15"
            style={{ backgroundImage: `url('${data.hero.backgroundImage}')` }}
          />
        )}
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
            {data.sections.finalCta.title}
          </h2>
          <p className="text-lg sm:text-xl text-red-100 mb-9 max-w-2xl mx-auto leading-relaxed">
            {data.sections.finalCta.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            {phoneHref && (
              <a
                href={phoneHref}
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-stone-100 text-red-700 px-7 py-4 rounded font-bold text-lg shadow-lg transition"
              >
                <Phone className="w-5 h-5" />
                {data.sections.finalCta.callButtonText} {data.business.phone}
              </a>
            )}
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-7 py-4 rounded font-bold text-lg shadow-lg transition"
            >
              <Mail className="w-5 h-5" />
              Request a Quote
            </button>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-red-100 text-sm">
            {data.business.hours && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {data.business.hours}
              </div>
            )}
            {data.business.address && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {data.business.address}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-slate-950 text-stone-400 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <LogoMark
                  logoUrl={data.business.logoUrl}
                  logoMark={data.business.logoMark}
                  businessName={data.business.name}
                  size="sm"
                  variant="light"
                />
                <div className="font-serif text-lg font-bold text-white">{data.business.name}</div>
              </div>
              <p className="text-sm leading-relaxed">{data.business.tagline}</p>
            </div>

            <div>
              <div className="font-semibold text-white text-sm uppercase tracking-wider mb-3">Contact</div>
              <div className="space-y-2 text-sm">
                {phoneHref && (
                  <a href={phoneHref} className="flex items-center gap-2 hover:text-amber-400 transition">
                    <Phone className="w-3.5 h-3.5" />
                    {data.business.phone}
                  </a>
                )}
                {data.business.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {data.business.address}
                  </div>
                )}
              </div>
            </div>

            <div>
              {data.business.hours && (
                <>
                  <div className="font-semibold text-white text-sm uppercase tracking-wider mb-3">Hours</div>
                  <div className="text-sm">{data.business.hours}</div>
                </>
              )}
              {data.about.certifications.length > 0 && (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-1.5">
                    {data.about.certifications.slice(0, 2).map((cert, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 bg-slate-900 text-stone-300 px-2 py-1 rounded text-xs"
                      >
                        <Shield className="w-3 h-3 text-amber-400" />
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
            <div>© {new Date().getFullYear()} {data.business.name}. All rights reserved.</div>
            <div className="text-stone-500">
              Powered by{" "}
              <a href="https://tradebase.contractors" className="text-amber-400 font-semibold">
                TradeBase
              </a>
            </div>
          </div>
        </div>
      </footer>

      <SharedQuoteModal
        contractorName={profile.name}
        slug={profile.slug}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        accentColor="#f5a623"
      />
    </div>
  );
}
