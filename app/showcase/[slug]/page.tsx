import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import ShowcaseClient from "./ShowcaseClient";
import { CONTRACTORS } from "@/app/find-contractors/mockData";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === "1") return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return raw;
}

async function loadShowcase(slug: string) {
  const a = createAdminClient() as any;

  const { data: pub } = await a
    .from("public_profiles")
    .select("org_id, slug, trade, photo_url, service_area, tagline, years_experience, license_text, is_published, trust_highlights, services, phone, revenue_display")
    .eq("slug", slug)
    .maybeSingle();

  if (!pub) {
    // Dev fallback: return mock data for any contractor in the CONTRACTORS array
    const mockContractor = CONTRACTORS.find(c => c.slug === slug);
    if (mockContractor) {
      const certifications = [
        mockContractor.licensed ? "Licensed & Insured" : null,
        mockContractor.insured ? "Fully Insured" : null,
        mockContractor.verified ? "Verified Contractor" : null,
        mockContractor.veteran_owned ? "Veteran-Owned" : null,
      ].filter(Boolean) as string[];
      return {
        profile: {
          name: mockContractor.name,
          slug,
          trade: mockContractor.trade,
          location: mockContractor.location,
          photo_url: null,
          tagline: mockContractor.tagline,
          years_experience: mockContractor.years_in_business,
          license_text: mockContractor.licensed ? "Licensed & Insured" : null,
          is_published: true,
          phone: "",
          phoneFormatted: "",
          revenue_display: "",
          certifications,
          serviceNames: mockContractor.services,
        },
        stats: {
          projectCount: mockContractor.verified_projects,
          totalCost: 0,
          reviewCount: mockContractor.reviews_tb,
          avgRating: mockContractor.rating_tb,
          recommendRate: 96,
          certCount: certifications.length,
        },
        projects: [],
        reviews: [],
        galleryPhotos: [],
      };
    }
    return null;
  }

  const [{ data: org }, { data: projects }, { data: reviewRows }, { data: settings }] = await Promise.all([
    a.from("orgs").select("name").eq("id", pub.org_id).single(),
    a.from("projects")
      .select("id,title,description,status,location,completed_at,photos,tags,cost,created_at")
      .eq("org_id", pub.org_id)
      .order("completed_at", { ascending: false, nullsFirst: false }),
    a.from("profile_reviews")
      .select("reviewer_name,rating,text,job_type,location,created_at")
      .eq("org_id", pub.org_id)
      .eq("approved", true)
      .order("created_at", { ascending: false }),
    a.from("org_settings").select("logo_url,address,city,state").eq("org_id", pub.org_id).maybeSingle(),
  ]);

  const projectList = (projects ?? []).map((p: any) => ({
    id: p.id,
    title: p.title ?? "Untitled Project",
    description: p.description ?? null,
    status: p.status ?? "completed",
    location: p.location ?? null,
    completed_at: p.completed_at ?? null,
    photos: (p.photos ?? []) as { url: string; caption: string }[],
    tags: (p.tags ?? []) as string[],
    cost: p.cost ? Number(p.cost) : null,
  }));

  const fetchedReviews = (reviewRows ?? []) as any[];
  const reviewCount = fetchedReviews.length;
  const avgRating = reviewCount > 0
    ? Math.round((fetchedReviews.reduce((s: number, r: any) => s + r.rating, 0) / reviewCount) * 100) / 100
    : 0;
  const recommendRate = reviewCount > 0
    ? Math.round((fetchedReviews.filter((r: any) => r.rating >= 4).length / reviewCount) * 100)
    : 98;

  const rawHighlights: string[] = Array.isArray(pub.trust_highlights) ? pub.trust_highlights : [];
  const certifications = rawHighlights
    .filter((t: string) => typeof t === "string" && t.trim())
    .map((t: string) => {
      const match = t.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
      return match ? t.slice(match[0].length).trim() : t.trim();
    });

  const rawServices: any[] = Array.isArray(pub.services) ? pub.services : [];
  const serviceNames: string[] = rawServices.map((s: any) =>
    typeof s === "string" ? s : (s?.name ?? "")
  ).filter(Boolean);

  const totalCost = projectList.reduce((s: number, p: any) => s + (p.cost ?? 0), 0);
  const location = pub.service_area ?? [settings?.city, settings?.state].filter(Boolean).join(", ") ?? "";

  const phone = pub.phone ?? "";
  const phoneDigits = phone.replace(/\D/g, "");

  // `photos` column on public_profiles is not yet available (migration_public_profile_photos.sql pending)
  // Once that migration is applied, add `photos` back to the select above and restore this derivation:
  //   (pub.photos ?? []).filter((p: any) => p?.url).map((p: any) => ({ url: p.url, title: p.title ?? "" }))
  const galleryPhotos: { url: string; title?: string }[] = [];

  return {
    profile: {
      name: org?.name ?? "Portfolio",
      slug,
      trade: pub.trade ?? "",
      location,
      photo_url: pub.photo_url ?? settings?.logo_url ?? null,
      tagline: pub.tagline ?? "",
      years_experience: pub.years_experience ?? 0,
      license_text: pub.license_text ?? null,
      is_published: pub.is_published ?? false,
      phone: phoneDigits ? `tel:+1${phoneDigits.replace(/^1/, "")}` : "",
      phoneFormatted: phone ? formatPhone(phone) : "",
      revenue_display: pub.revenue_display ?? "",
      certifications,
      serviceNames,
    },
    stats: {
      projectCount: projectList.length,
      totalCost,
      reviewCount,
      avgRating,
      recommendRate,
      certCount: certifications.length,
    },
    projects: projectList,
    reviews: fetchedReviews.slice(0, 5).map((r: any) => ({
      name: r.reviewer_name ?? "Customer",
      rating: r.rating,
      text: r.text ?? "",
      jobType: r.job_type ?? "",
      location: r.location ?? "",
      date: r.created_at ? new Date(r.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "",
    })),
    galleryPhotos,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const data = await loadShowcase(slug);
  if (!data) notFound();

  let isOwner = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const orgId = await ensureUserOrg();
      const a = createAdminClient() as any;
      const { data: pub } = await a.from("public_profiles").select("org_id").eq("slug", slug).maybeSingle();
      isOwner = pub?.org_id === orgId;
    }
  } catch { /* not logged in */ }

  return <ShowcaseClient {...data} isOwner={isOwner} />;
}
