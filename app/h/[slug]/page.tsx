import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import HomeownerShowcaseClient from "./HomeownerShowcaseClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function loadShowcase(slug: string) {
  const a = createAdminClient() as any;

  const { data: profile } = await a
    .from("homeowner_profiles")
    .select("id,display_name,avatar_url,banner_url,location,is_profile_public,member_since,slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!profile) return null;

  const [projectsRes, propertyRes, futureRes, scorecardRes] = await Promise.all([
    a.from("homeowner_projects")
      .select("id,title,contractor_name,description,review_text,cost,project_date,completed_date,rating,has_warranty,has_documentation,photos,status")
      .eq("homeowner_id", profile.id)
      .order("project_date", { ascending: false, nullsFirst: false }),
    a.from("homeowner_properties")
      .select("property_type,sq_footage,lot_size,year_built,bedrooms,bathrooms,updated_at")
      .eq("homeowner_id", profile.id)
      .maybeSingle(),
    a.from("homeowner_future_projects")
      .select("id,title,status,cover_image_url,notes")
      .eq("homeowner_id", profile.id)
      .order("created_at", { ascending: true })
      .limit(8),
    a.from("homeowner_scorecard")
      .select("category,score_status")
      .eq("homeowner_id", profile.id),
  ]);

  const projects = (projectsRes.data ?? []).map((p: any) => ({
    id: p.id as string,
    title: p.title as string,
    contractor_name: (p.contractor_name ?? null) as string | null,
    description: (p.description ?? null) as string | null,
    review_text: (p.review_text ?? null) as string | null,
    cost: p.cost ? Number(p.cost) : null,
    project_date: (p.project_date ?? null) as string | null,
    completed_date: (p.completed_date ?? null) as string | null,
    rating: p.rating ? Number(p.rating) : null,
    has_warranty: !!(p.has_warranty),
    has_documentation: !!(p.has_documentation),
    photos: (p.photos ?? []) as string[],
    status: (p.status ?? "completed") as string,
  }));

  const totalInvested = projects.reduce((s, p) => s + (p.cost ?? 0), 0);
  const rated = projects.filter(p => p.rating != null);
  const avgRating = rated.length > 0
    ? rated.reduce((s, p) => s + (p.rating ?? 0), 0) / rated.length
    : null;
  const contractorsWorked = new Set(projects.map(p => p.contractor_name).filter(Boolean)).size;

  return {
    profile: {
      displayName: profile.display_name || "Homeowner",
      avatarUrl: (profile.avatar_url ?? null) as string | null,
      bannerUrl: (profile.banner_url ?? null) as string | null,
      location: (profile.location ?? null) as string | null,
      isPublic: (profile.is_profile_public ?? true) as boolean,
      memberSince: (profile.member_since ?? null) as string | null,
      slug,
    },
    property: (propertyRes.data ?? null) as {
      property_type: string | null; sq_footage: number | null; lot_size: string | null;
      year_built: number | null; bedrooms: number | null; bathrooms: number | null; updated_at: string | null;
    } | null,
    projects,
    futureProjects: (futureRes.data ?? []) as { id: string; title: string; status: string; cover_image_url: string | null; notes: string | null }[],
    scorecard: (scorecardRes.data ?? []) as { category: string; score_status: string }[],
    stats: { projectCount: projects.length, totalInvested, avgRating, contractorsWorked },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const data = await loadShowcase(slug);
  if (!data) notFound();
  return <HomeownerShowcaseClient {...data} />;
}
