import { createAdminClient } from "@/lib/supabase/admin";
import FindContractorsClient from "./FindContractorsClient";
import type { Contractor } from "./mockData";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Find Contractors Near You | TradeBase",
  description: "Discover verified local contractors for roofing, plumbing, electrical, HVAC, and more. Read real reviews and get quotes fast.",
};

// Portland OR center — used to compute distance when no user location is known
const CENTER_LAT = 45.52;
const CENTER_LNG = -122.68;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

const AVATAR_COLORS: Record<string, string> = {
  Roofing: "#1B3A6B",
  Electrician: "#D97706",
  Plumbing: "#1D4ED8",
  HVAC: "#0891B2",
  Painting: "#7C3AED",
  Concrete: "#78716C",
  Flooring: "#D97706",
  Masonry: "#B91C1C",
  Solar: "#CA8A04",
  Landscaping: "#059669",
  Remodeling: "#B45309",
  General: "#1B3A6B",
};

async function fetchLiveContractors(): Promise<Contractor[]> {
  const admin = createAdminClient();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (admin as any)
      .from("public_profiles")
      .select("org_id, slug, trade, tagline, services, about_bullets, photo_url, years_experience")
      .eq("is_published", true);

    if (!profiles?.length) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orgIds = (profiles as any[]).map((p) => p.org_id);

    const [{ data: settingsRows }, { data: orgRows }, { data: reviewRows }] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any)
        .from("org_settings")
        .select("org_id, city, state, lat, lng, license_number, insurance_number")
        .in("org_id", orgIds)
        .not("lat", "is", null),
      admin.from("orgs").select("id, name").in("id", orgIds),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any)
        .from("profile_reviews")
        .select("org_id, rating")
        .in("org_id", orgIds)
        .eq("approved", true),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settingsMap: Record<string, any> = Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (settingsRows ?? []).map((s: any) => [s.org_id, s])
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orgsMap: Record<string, any> = Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (orgRows ?? []).map((o: any) => [o.id, o])
    );

    // Group review ratings by org
    const reviewMap: Record<string, number[]> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (reviewRows ?? []) as any[]) {
      if (!reviewMap[r.org_id]) reviewMap[r.org_id] = [];
      reviewMap[r.org_id].push(r.rating);
    }

    const contractors: Contractor[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of profiles as any[]) {
      const s = settingsMap[p.org_id];
      if (!s?.lat || !s?.lng) continue; // skip orgs without a geocoded address

      const o = orgsMap[p.org_id];
      const ratings: number[] = reviewMap[p.org_id] ?? [];
      const avgRating =
        ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : 5.0;

      const trade = (p.trade as string) || "General";
      const services: string[] = Array.isArray(p.services)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? p.services.map((sv: any) => (typeof sv === "string" ? sv : sv?.name ?? "")).filter(Boolean)
        : [];

      contractors.push({
        id: p.org_id as string,
        slug: (p.slug as string) || p.org_id,
        name: (o?.name as string) || "Local Contractor",
        trade,
        services,
        tagline: (p.tagline as string) || "",
        description: Array.isArray(p.about_bullets)
          ? (p.about_bullets as string[]).join(" ")
          : "",
        location: [s.city, s.state].filter(Boolean).join(", "),
        city: (s.city as string) || "",
        distance: haversineDistance(CENTER_LAT, CENTER_LNG, s.lat, s.lng),
        rating_google: avgRating,
        reviews_google: ratings.length,
        rating_tb: avgRating,
        reviews_tb: ratings.length,
        verified_projects: 0,
        repeat_customers: 0,
        licensed: !!s.license_number,
        insured: !!s.insurance_number,
        emergency: false,
        verified: true,
        veteran_owned: false,
        years_in_business: (p.years_experience as number) || 0,
        jobs_completed: 0,
        cover_color: "from-slate-700 to-slate-900",
        cover_photo: (p.photo_url as string) || "",
        project_photos: Array.isArray(p.photos)
          ? (p.photos as string[]).slice(0, 3)
          : [],
        avatar_color: AVATAR_COLORS[trade] ?? "#1B3A6B",
        lat: s.lat as number,
        lng: s.lng as number,
        featured: false,
        response_time: "~2 hrs",
      });
    }

    return contractors;
  } catch (err) {
    console.error("[find-contractors] live data fetch error:", err);
    return [];
  }
}

export default async function FindContractorsPage() {
  const liveContractors = await fetchLiveContractors();
  return <FindContractorsClient liveContractors={liveContractors} />;
}
