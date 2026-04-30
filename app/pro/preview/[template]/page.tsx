import { notFound } from "next/navigation";
import { ContractorProfilePage } from "@/app/pro/[slug]/ContractorProfilePage";
import { ClassicContractorTemplate } from "@/components/templates/ClassicContractorTemplate";
import { ModernProTemplate } from "@/components/templates/ModernProTemplate";
import { TrustContractorTemplate } from "@/components/templates/TrustContractorTemplate";
import { PreviewBanner } from "@/app/pro/preview/PreviewBanner";
import type { ContractorProfile } from "@/app/pro/[slug]/types";

type Props = { params: Promise<{ template: string }> };

const SAMPLE_PROFILE: ContractorProfile = {
  slug: "preview",
  isPublished: true,
  name: "Atlas Mechanical LLC",
  trade: "HVAC & Plumbing",
  tagline: "Your local heating, cooling, and plumbing experts since 2008.",
  location: "Denver, CO",
  phone: "tel:7205550192",
  phoneFormatted: "(720) 555-0192",
  rating: 4.9,
  reviewCount: 127,
  urgencyLine: "⚡ Same-day service available — call before noon",
  stats: {
    jobsCompleted: 842,
    revenue: "$2.4M+",
    yearsExperience: 16,
  },
  trustItems: [
    { icon: "⚡", text: "Same-Day Response" },
    { icon: "💬", text: "Transparent Pricing" },
    { icon: "🛡️", text: "Licensed & Insured" },
    { icon: "📍", text: "Local Contractor" },
  ],
  featuredReview: {
    text: "Atlas came out the same day my furnace died in January. Fixed it in 90 minutes and the price was completely fair. I won't call anyone else.",
    reviewer: "Sandra K.",
    jobType: "Furnace Repair",
    location: "Highlands Ranch, CO",
  },
  services: [
    "Furnace Repair & Installation",
    "AC Tune-Up & Replacement",
    "Water Heater Service",
    "Drain Cleaning",
    "Leak Detection",
    "Duct Cleaning",
    "Thermostat Installation",
    "Emergency Plumbing",
  ],
  reviews: [
    {
      name: "Marcus T.",
      stars: 5,
      jobType: "AC Replacement",
      location: "Parker, CO",
      text: "Replaced my entire AC unit in one day. Crew was professional, cleaned up everything, and the new system runs perfectly.",
      verified: true,
    },
    {
      name: "Linda R.",
      stars: 5,
      jobType: "Water Heater",
      location: "Littleton, CO",
      text: "Hot water was back on within 3 hours of my call. Extremely happy with the service and the fair price.",
      verified: true,
    },
    {
      name: "James W.",
      stars: 5,
      jobType: "Drain Cleaning",
      location: "Aurora, CO",
      text: "Had a stubborn clog that two other plumbers couldn't clear. Atlas got it done in 45 minutes. Highly recommend.",
      verified: false,
    },
  ],
  about: [
    { icon: "🏅", text: "Master HVAC & Plumbing License #CO-34821" },
    { icon: "🔧", text: "Factory-trained on Carrier, Trane & Rheem systems" },
    { icon: "🌱", text: "Energy-efficient upgrade specialists" },
    { icon: "👨‍👩‍👧‍👦", text: "Family-owned and operated since 2008" },
  ],
  licenseNumber: "CO-34821 · EPA 608 Certified",
  serviceArea: "Denver Metro, Aurora, Lakewood, Highlands Ranch, Parker, Littleton",
  photos: [
    { url: "", title: "Carrier 3-Ton AC Install", location: "Parker, CO", timeAgo: "2 weeks ago", cost: "$4,200", featured: true },
    { url: "", title: "Tankless Water Heater",    location: "Littleton, CO", timeAgo: "1 month ago", cost: "$1,850" },
    { url: "", title: "Full Duct Replacement",    location: "Aurora, CO", timeAgo: "6 weeks ago", cost: "$3,100" },
  ],
  selectedTemplate: "",
};

// URL slug → { display name, internal template id }
const TEMPLATE_MAP: Record<string, { name: string; id: string }> = {
  default: { name: "Default",    id: "" },
  classic: { name: "Classic",    id: "classic" },
  modern:  { name: "Modern Pro", id: "modern" },
  trust:   { name: "Trust",      id: "trust" },
};

export default async function PreviewPage({ params }: Props) {
  const { template } = await params;
  const entry = TEMPLATE_MAP[template];
  if (!entry) notFound();

  const profile: ContractorProfile = { ...SAMPLE_PROFILE, selectedTemplate: entry.id };

  return (
    <>
      <PreviewBanner templateName={entry.name} />
      <div style={{ paddingTop: 38 }}>
        {entry.id === "classic" && <ClassicContractorTemplate profile={profile} />}
        {entry.id === "modern"  && <ModernProTemplate profile={profile} />}
        {entry.id === "trust"   && <TrustContractorTemplate profile={profile} />}
        {entry.id === ""        && <ContractorProfilePage profile={profile} />}
      </div>
    </>
  );
}
