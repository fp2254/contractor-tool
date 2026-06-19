import type { ContractorProfile } from "./types";

export const MOCK_PROFILES: Record<string, ContractorProfile> = {
  "mike-sullivan-roofing": {
    slug: "mike-sullivan-roofing",
    isPublished: true,
    name: "Mike Sullivan",
    trade: "Roofing & Exteriors",
    tagline: "Fast, reliable roofing in Portland — free quotes same day",
    location: "Portland, OR",
    phone: "+15035550192",
    phoneFormatted: "(503) 555-0192",
    rating: 4.9,
    reviewCount: 23,
    urgencyLine: "Booking 2–3 days out — limited availability this week",
    stats: {
      jobsCompleted: 47,
      revenue: "$380K",
      yearsExperience: 8,
    },
    trustItems: [
      { icon: "⚡", text: "Same-day response" },
      { icon: "💰", text: "Transparent pricing" },
      { icon: "🛡️", text: "Licensed & insured" },
      { icon: "📍", text: "Local contractor" },
    ],
    featuredReview: {
      text: "Mike and his crew were incredible. Showed up on time every day, cleaned up after themselves, and the roof looks amazing. Got 3 quotes and his was fair. Would absolutely hire again.",
      reviewer: "Sarah M.",
      jobType: "Full Roof Replacement",
      location: "Lake Oswego",
    },
    services: [
      "Roof Replacement",
      "Roof Repair",
      "Gutters",
      "Siding",
      "Skylights",
      "Storm Damage",
      "Insurance Claims",
    ],
    photos: [],
    reviews: [
      {
        name: "Sarah M.",
        stars: 5,
        jobType: "Full Roof Replacement",
        location: "Lake Oswego",
        text: "Mike and his crew were incredible. Showed up on time every day, cleaned up after themselves, and the roof looks amazing. Got 3 quotes and his was fair. Would absolutely hire again.",
        verified: true,
      },
      {
        name: "Tom R.",
        stars: 5,
        jobType: "Gutter Installation",
        location: "Beaverton",
        text: "Fast, professional, honest. Sent me a quote the same day I called. No surprises on the invoice. This is how contracting should work.",
        verified: true,
      },
    ],
    about: [
      { icon: "🔨", text: "8 years experience in residential roofing" },
      { icon: "👤", text: "Owner-operated — I'm on every job" },
      { icon: "🛡️", text: "Licensed & insured · OR License #CCB-187432" },
      { icon: "📍", text: "Serving Portland metro & surrounding areas" },
    ],
    licenseNumber: "CCB-187432",
    serviceArea: "Portland metro & surrounding areas",
    sectionsConfig: {},
  },
};

export function getProfile(slug: string): ContractorProfile | null {
  return MOCK_PROFILES[slug] ?? null;
}
