import { createAdminClient } from "@/lib/supabase/admin";
import RealtorMapClient from "./RealtorMapClient";

export const dynamic = "force-dynamic";

export type ContractorPin = {
  id: string;
  slug: string;
  name: string;
  trade: string;
  location: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  licensed: boolean;
  insured: boolean;
  tagline: string;
  avatarColor: string;
};

const AVATAR_COLORS: Record<string, string> = {
  Roofing: "#1B3A6B",
  Electrician: "#D97706",
  Plumbing: "#0284C7",
  HVAC: "#0891B2",
  Painting: "#7C3AED",
  Concrete: "#64748B",
  Gutters: "#0F766E",
  "Tile & Flooring": "#B45309",
};

async function fetchContractors(): Promise<ContractorPin[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  try {
    const { data: profiles } = await admin
      .from("public_profiles")
      .select("org_id, slug, trade, tagline")
      .eq("is_published", true);

    if (!profiles?.length) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orgIds = (profiles as any[]).map((p: any) => p.org_id);

    const [{ data: settings }, { data: orgs }, { data: reviews }] = await Promise.all([
      admin
        .from("org_settings")
        .select("org_id, city, state, lat, lng, license_number, insurance_number")
        .in("org_id", orgIds)
        .not("lat", "is", null),
      admin.from("orgs").select("id, name").in("id", orgIds),
      admin
        .from("profile_reviews")
        .select("org_id, rating")
        .in("org_id", orgIds)
        .eq("approved", true),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settingsMap: Record<string, any> = Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (settings ?? []).map((s: any) => [s.org_id, s])
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orgsMap: Record<string, any> = Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (orgs ?? []).map((o: any) => [o.id, o])
    );
    const reviewMap: Record<string, number[]> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (reviews ?? []) as any[]) {
      if (!reviewMap[r.org_id]) reviewMap[r.org_id] = [];
      reviewMap[r.org_id].push(r.rating);
    }

    const pins: ContractorPin[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of profiles as any[]) {
      const s = settingsMap[p.org_id];
      if (!s?.lat || !s?.lng) continue;
      const o = orgsMap[p.org_id];
      const ratings: number[] = reviewMap[p.org_id] ?? [];
      const avg = ratings.length
        ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10
        : 0;
      const trade = (p.trade as string) || "General";
      pins.push({
        id: p.org_id as string,
        slug: (p.slug as string) || p.org_id,
        name: (o?.name as string) || "Local Contractor",
        trade,
        location: [s.city, s.state].filter(Boolean).join(", "),
        lat: s.lat as number,
        lng: s.lng as number,
        rating: avg,
        reviewCount: ratings.length,
        licensed: !!s.license_number,
        insured: !!s.insurance_number,
        tagline: (p.tagline as string) || "",
        avatarColor: AVATAR_COLORS[trade] ?? "#1B3A6B",
      });
    }
    return pins;
  } catch (err) {
    console.error("[realtor/map] contractor fetch error:", err);
    return [];
  }
}

export default async function RealtorMapPage() {
  const contractors = await fetchContractors();
  return <RealtorMapClient contractors={contractors} />;
}
