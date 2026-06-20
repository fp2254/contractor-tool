import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import ContractorPublicProfile from "./ContractorPublicProfile";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function loadContractor(slug: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = createAdminClient() as any;

  const { data: pub } = await a
    .from("public_profiles")
    .select("org_id,slug,trade,tagline,phone,service_area,urgency_line,years_experience,license_text,photo_url,services,about_bullets,photos,is_published,selected_template,trust_highlights,custom_blocks")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!pub) return null;

  const [orgRes, reviewsRes, jobCountRes, settingsRes] = await Promise.all([
    a.from("orgs").select("name").eq("id", pub.org_id).single(),
    a.from("profile_reviews")
      .select("reviewer_name,rating,text,job_type,location,verified,created_at")
      .eq("org_id", pub.org_id)
      .eq("approved", true)
      .order("created_at", { ascending: false }),
    a.from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", pub.org_id)
      .eq("status", "completed"),
    a.from("org_settings")
      .select("dba_name,logo_url,city,state,primary_phone")
      .eq("org_id", pub.org_id)
      .maybeSingle(),
  ]);

  const reviews = reviewsRes.data ?? [];
  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  function normalizeServices(raw: unknown[]) {
    return raw.map(s => typeof s === "string" ? { name: s, description: "" } : { name: (s as { name?: string }).name ?? "", description: (s as { description?: string }).description ?? "" });
  }

  function parseAbout(bullets: string[]) {
    return (bullets ?? []).filter(Boolean).map(b => {
      const m = b.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
      return m ? { icon: m[0].trim(), text: b.slice(m[0].length).trim() } : { icon: "✓", text: b };
    });
  }

  const settings = settingsRes.data ?? {};
  const businessName = settings.dba_name || orgRes.data?.name || "Contractor";
  const phone = pub.phone || settings.primary_phone || "";

  return {
    slug: pub.slug,
    orgId: pub.org_id,
    businessName,
    trade: pub.trade ?? "",
    tagline: pub.tagline ?? "",
    phone,
    serviceArea: pub.service_area ?? [settings.city, settings.state].filter(Boolean).join(", ") ?? "",
    urgencyLine: pub.urgency_line ?? "",
    yearsExperience: pub.years_experience ?? 0,
    licenseText: pub.license_text ?? "",
    photoUrl: pub.photo_url ?? settings.logo_url ?? null,
    services: normalizeServices(pub.services ?? []),
    aboutBullets: parseAbout(pub.about_bullets ?? []),
    photos: (pub.photos ?? []).filter((p: { url?: string }) => p?.url) as { url: string; title?: string; location?: string; cost?: string }[],
    trustHighlights: Array.isArray(pub.trust_highlights) ? (pub.trust_highlights as string[]).filter(Boolean) : [],
    customBlocks: Array.isArray(pub.custom_blocks) ? pub.custom_blocks as { id: string; icon: string; title: string; body: string }[] : [],
    reviews: reviews.map((r: { reviewer_name: string; rating: number; text: string; job_type: string; location: string; verified: boolean; created_at: string }) => ({
      reviewerName: r.reviewer_name,
      rating: r.rating,
      text: r.text,
      jobType: r.job_type ?? "",
      location: r.location ?? "",
      verified: r.verified ?? false,
      createdAt: r.created_at,
    })),
    stats: {
      completedJobs: jobCountRes.count ?? 0,
      yearsExperience: pub.years_experience ?? 0,
      avgRating,
      reviewCount: reviews.length,
    },
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await loadContractor(slug);
  if (!c) return { title: "Contractor Not Found | TradeBase" };
  return {
    title: `${c.businessName} — ${c.trade} | TradeBase`,
    description: c.tagline || `${c.businessName} — ${c.trade} serving ${c.serviceArea}`,
  };
}

export default async function ContractorProfilePage({ params }: Props) {
  const { slug } = await params;
  const contractor = await loadContractor(slug);
  if (!contractor) notFound();
  return <ContractorPublicProfile contractor={contractor} />;
}
