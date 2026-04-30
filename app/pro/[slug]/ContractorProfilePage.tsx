"use client";

import { useState } from "react";
import { Barlow, Barlow_Condensed } from "next/font/google";
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

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  display: "swap",
});

const C = {
  offWhite: "#f4f5f7",
  navy: "#0f1f3d",
  navyMid: "#1a2f52",
  gray: "#8a9ab5",
  lightGray: "#e8ecf2",
  gold: "#f5a623",
};

type Props = {
  profile: ContractorProfile;
};

export function ContractorProfilePage({ profile }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const bc = barlowCondensed.className;

  return (
    <div
      className={barlow.className}
      style={{ backgroundColor: C.offWhite, color: "#1a2035", paddingBottom: 76, minHeight: "100vh" }}
    >
      <HeroSection profile={profile} condensedFont={bc} onQuoteClick={() => setModalOpen(true)} />
      <StatsBar stats={profile.stats} condensedFont={bc} />
      <TrustStrip items={profile.trustItems} />
      {profile.featuredReview && <FeaturedReview review={profile.featuredReview} />}
      <ServicesSection services={profile.services} condensedFont={bc} />
      <ProjectsSection photos={profile.photos} condensedFont={bc} />
      <ReviewsSection reviews={profile.reviews} condensedFont={bc} />
      <ReviewForm slug={profile.slug} condensedFont={bc} />
      <AboutSection about={profile.about} licenseNumber={profile.licenseNumber} condensedFont={bc} />
      <BottomCloser />

      {/* Powered by bar */}
      <div
        style={{
          background: C.offWhite,
          borderTop: `1px solid ${C.lightGray}`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          fontSize: 12,
          color: C.gray,
        }}
      >
        <span>Powered by</span>
        <a
          href="https://tradebase.contractors"
          className={bc}
          style={{ fontWeight: 700, color: C.navy, textDecoration: "none", fontSize: 14 }}
        >
          TradeBase
        </a>
        <span>· Built for contractors</span>
      </div>

      {/* Footer */}
      <div
        style={{
          backgroundColor: C.navyMid,
          padding: "14px 24px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
          Are you a contractor?{" "}
          <a
            href="https://tradebase.contractors/waitlist"
            style={{ color: C.gold, textDecoration: "none", fontWeight: 600 }}
          >
            Get more jobs with TradeBase →
          </a>
        </p>
      </div>

      <StickyBar
        phone={profile.phone}
        phoneFormatted={profile.phoneFormatted}
        condensedFont={bc}
        onQuoteClick={() => setModalOpen(true)}
      />

      <QuoteModal
        contractorName={profile.name}
        slug={profile.slug}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        condensedFont={bc}
      />
    </div>
  );
}
