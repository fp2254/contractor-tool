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

  const [projectsRes, propertyRes, futureRes] = await Promise.all([
    a.from("homeowner_projects")
      .select("id,title,contractor_name,description,cost,project_date,rating,review_text,has_warranty,photos,status")
      .eq("homeowner_id", profile.id)
      .order("project_date", { ascending: false, nullsFirst: false }),
    a.from("homeowner_properties")
      .select("property_type,sq_footage,lot_size,year_built,bedrooms,bathrooms")
      .eq("homeowner_id", profile.id)
      .maybeSingle(),
    a.from("homeowner_future_projects")
      .select("id,title,status,notes")
      .eq("homeowner_id", profile.id)
      .order("created_at", { ascending: true })
      .limit(6),
  ]);

  const projects = (projectsRes.data ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    contractor_name: p.contractor_name ?? null,
    description: p.description ?? null,
    cost: p.cost ? Number(p.cost) : null,
    project_date: p.project_date ?? null,
    rating: p.rating ? Number(p.rating) : null,
    review_text: p.review_text ?? null,
    has_warranty: p.has_warranty ?? false,
    photos: (p.photos ?? []) as { url: string; caption: string }[],
    status: p.status ?? "completed",
  }));

  const totalInvested = projects.reduce((s: number, p: any) => s + (p.cost ?? 0), 0);
  const rated = projects.filter((p: any) => p.rating);
  const avgRating = rated.length > 0
    ? rated.reduce((s: number, p: any) => s + p.rating, 0) / rated.length
    : null;

  return {
    profile: {
      displayName: profile.display_name || "Homeowner",
      avatarUrl: profile.avatar_url ?? null,
      bannerUrl: profile.banner_url ?? null,
      location: profile.location ?? null,
      isPublic: profile.is_profile_public ?? true,
      memberSince: profile.member_since ?? null,
      slug,
    },
    property: propertyRes.data ?? null,
    projects,
    futureProjects: futureRes.data ?? [],
    stats: { projectCount: projects.length, totalInvested, avgRating },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const data = await loadShowcase(slug);
  if (!data) notFound();
  return <HomeownerShowcaseClient {...data} />;
}
