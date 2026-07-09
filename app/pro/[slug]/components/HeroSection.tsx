"use client";

import { useState } from "react";
import { Phone, MessageCircle, MapPin, BadgeCheck, Share2 } from "lucide-react";
import Link from "next/link";
import type { ContractorProfile } from "../types";

function ShareButton({ slug, name, trade }: { slug: string; name: string; trade: string }) {
  const [state, setState] = useState<"idle" | "shared" | "copied">("idle");

  async function handleShare() {
    const url = `https://tradebase.contractors/pro/${slug}`;
    let success = false;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${name} — ${trade}`, url });
        setState("shared");
        success = true;
      } catch { /* cancelled */ }
    }
    if (!success && typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setState("copied");
        success = true;
      } catch { /* nothing */ }
    }
    if (success) setTimeout(() => setState("idle"), 2200);
  }

  const label = state === "shared" ? "Shared!" : state === "copied" ? "Copied!" : "Share";

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold border border-white/40 text-white hover:bg-white/10 transition-colors"
    >
      <Share2 size={12} />
      {label}
    </button>
  );
}

function Stars({ count, size = 13 }: { count: number; size?: number }) {
  return (
    <span style={{ display: "flex", gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: "#f5a623", fontSize: size }}>★</span>
      ))}
    </span>
  );
}

type Props = {
  profile: ContractorProfile;
  onQuoteClick: () => void;
};

export function HeroSection({ profile, onQuoteClick }: Props) {
  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "TB";

  const firstName = profile.name.split(" ")[0];

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f2652 0%, #1B3A6B 60%, #2a4d85 100%)",
      }}
    >
      <div className="max-w-4xl mx-auto px-5 pt-8 pb-12 sm:pt-10 sm:pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt={profile.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-white/90 shadow-lg shrink-0"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white border-4 border-white/90 shadow-lg shrink-0"
              style={{ backgroundColor: "#1B3A6B" }}
            >
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{profile.name}</h1>
            <p className="text-sm text-blue-100/90 font-medium mt-0.5 uppercase tracking-wider">
              {profile.trade}
            </p>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
              {profile.location && (
                <p className="flex items-center gap-1.5 text-xs text-blue-100/80">
                  <MapPin size={13} />
                  {profile.location}
                </p>
              )}
              {profile.rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <Stars count={5} />
                  <span className="text-white font-bold text-xs">{profile.rating}</span>
                  <span className="text-blue-100/60 text-[10px]">({profile.reviewCount} reviews)</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end shrink-0">
            <div className="flex gap-2">
              <a
                href={`tel:${profile.phone}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold bg-white text-[#1B3A6B] shadow-sm hover:bg-blue-50 transition-colors"
              >
                <Phone size={15} />
                Call {firstName}
              </a>
              <button
                onClick={onQuoteClick}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold border border-white/40 text-white hover:bg-white/10 transition-colors"
              >
                <MessageCircle size={15} />
                Quote
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <ShareButton slug={profile.slug} name={profile.name} trade={profile.trade} />
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                <BadgeCheck size={12} />
                Verified
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-blue-100/80 text-sm max-w-2xl leading-relaxed">
          {profile.tagline && profile.tagline.trim()
            ? profile.tagline
            : `Licensed & insured · Fast quotes · Serving ${profile.location || "your area"}`}
        </div>
      </div>
    </div>
  );
}
