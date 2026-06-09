import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import ShowcaseClient from "./ShowcaseClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function loadShowcase(slug: string) {
  const a = createAdminClient() as any;

  const { data: pub } = await a
    .from("public_profiles")
    .select("org_id, slug, trade, photo_url, service_area, tagline, years_experience, license_text")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!pub) return null;

  const [{ data: org }, { data: member }] = await Promise.all([
    a.from("orgs").select("name").eq("id", pub.org_id).single(),
    a.from("org_members").select("user_id").eq("org_id", pub.org_id).limit(1).single(),
  ]);

  if (!member?.user_id) return null;

  const { data: hp } = await a
    .from("homeowner_profiles")
    .select("id, display_name, avatar_url, banner_url, location, is_profile_public")
    .eq("user_id", member.user_id)
    .maybeSingle();

  const projects = hp?.is_profile_public
    ? (await a.from("homeowner_projects").select("*").eq("homeowner_id", hp.id)
        .order("project_date", { ascending: false, nullsFirst: false })).data ?? []
    : [];

  const totalInvested = projects.reduce((s: number, p: any) => s + (p.cost ?? 0), 0);
  const rated = projects.filter((p: any) => p.rating);
  const avgRating = rated.length > 0 ? rated.reduce((s: number, p: any) => s + p.rating, 0) / rated.length : null;

  return {
    contractor: {
      name: org?.name ?? "Contractor",
      slug,
      trade: pub.trade ?? "",
      location: pub.service_area ?? hp?.location ?? "",
      photo_url: pub.photo_url ?? hp?.avatar_url ?? null,
      tagline: pub.tagline ?? "",
      years_experience: pub.years_experience ?? null,
      license_text: pub.license_text ?? null,
      jobs_completed: null,
    },
    stats: { projectCount: projects.length, totalInvested, avgRating },
    projects,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const data = await loadShowcase(slug);
  if (!data) notFound();
  return <ShowcaseClient {...data} />;
}
