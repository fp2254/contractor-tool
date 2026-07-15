"use client";

import { useState } from "react";
import type { ContractorProfile } from "./types";
import { HeroSection } from "./components/HeroSection";
import { StatsBar } from "./components/StatsBar";
import { TrustStrip } from "./components/TrustStrip";
import { FeaturedReview } from "./components/FeaturedReview";
import { ServicesSection } from "./components/ServicesSection";
import { ProjectsSection } from "./components/ProjectsSection";
import { ReviewsSection } from "./components/ReviewsSection";
import { AboutSection } from "./components/AboutSection";
import { BottomCloser } from "./components/BottomCloser";
import { StickyBar } from "./components/StickyBar";
import { QuoteModal } from "./components/QuoteModal";
import { ReviewForm } from "./components/ReviewForm";

type Props = {
  profile: ContractorProfile;
};

export function ContractorProfilePage({ profile }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div
      className="min-h-screen bg-gray-100 pb-20"
      style={{ color: "#1a2035" }}
    >
      <HeroSection profile={profile} onQuoteClick={() => setModalOpen(true)} />
      
      <div className="max-w-4xl mx-auto px-4 -mt-6 sm:-mt-8 space-y-4">
        <StatsBar stats={profile.stats} />
        <TrustStrip items={profile.trustItems} />
        {profile.featuredReview && <FeaturedReview review={profile.featuredReview} />}
        <ServicesSection services={profile.services} />
        <ProjectsSection photos={profile.photos} />

        {/* Portfolio showcase link */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-slate-800 text-sm">
              📁 Project Showcase
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Browse completed projects with photos &amp; details
            </p>
          </div>
          <a
            href={`/showcase/${profile.slug}`}
            className="bg-[#1B3A6B] text-white font-semibold text-xs px-4 py-2 rounded-xl hover:bg-[#152e55] transition-colors shrink-0"
          >
            View Portfolio →
          </a>
        </div>

        <ReviewsSection reviews={profile.reviews} />
        <ReviewForm slug={profile.slug} />
        <AboutSection about={profile.about} licenseNumber={profile.licenseNumber} />
        <BottomCloser />

        {/* Powered by bar */}
        <div className="flex items-center justify-center gap-1.5 py-4 text-xs text-gray-400">
          <span>Powered by</span>
          <a
            href="https://tradebase.contractors"
            className="font-bold text-[#1B3A6B] hover:underline"
          >
            TradeBase
          </a>
          <span>· Built for contractors</span>
        </div>

        {/* Footer */}
        <div className="bg-[#1B3A6B]/5 rounded-2xl p-4 text-center border border-[#1B3A6B]/10">
          <p className="text-xs text-gray-500">
            Are you a contractor?{" "}
            <a
              href="https://tradebase.contractors/waitlist"
              className="text-[#1B3A6B] font-semibold hover:underline"
            >
              Get more jobs with TradeBase →
            </a>
          </p>
        </div>
      </div>

      <StickyBar
        phone={profile.phone}
        phoneFormatted={profile.phoneFormatted}
        onQuoteClick={() => setModalOpen(true)}
      />

      <QuoteModal
        contractorName={profile.name}
        slug={profile.slug}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
