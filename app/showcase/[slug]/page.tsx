import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import ShowcaseClient from "./ShowcaseClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function loadShowcase(slug: string) {
  const a = createAdminClient() as any;

  const { data: pub } = await a
    .from("public_profiles")
    .select("org_id, slug, trade, photo_url, service_area, tagline, years_experience, license_text, is_published")
    .eq("slug", slug)
    .maybeSingle();

  if (!pub) return null;

  const [{ data: org }, { data: settings }, { data: projects }] = await Promise.all([
    a.from("orgs").select("name").eq("id", pub.org_id).single(),
    a.from("org_settings").select("logo_url,address,city,state").eq("org_id", pub.org_id).maybeSingle(),
    a.from("projects")
      .select("id,title,description,status,location,completed_at,photos,tags,cost,created_at")
      .eq("org_id", pub.org_id)
      .order("completed_at", { ascending: false, nullsFirst: false }),
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

  const totalInvested = projectList.reduce((s: number, p: any) => s + (p.cost ?? 0), 0);
  const location = pub.service_area ?? [settings?.city, settings?.state].filter(Boolean).join(", ") ?? "";

  return {
    profile: {
      name: org?.name ?? "Portfolio",
      slug,
      trade: pub.trade ?? "",
      location,
      photo_url: pub.photo_url ?? settings?.logo_url ?? null,
      tagline: pub.tagline ?? "",
      years_experience: pub.years_experience ?? null,
      license_text: pub.license_text ?? null,
      is_published: pub.is_published ?? false,
    },
    stats: { projectCount: projectList.length, totalInvested },
    projects: projectList,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const data = await loadShowcase(slug);
  if (!data) notFound();

  // Detect if the logged-in contractor owns this showcase
  let isOwner = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const orgId = await ensureUserOrg();
      const a = createAdminClient() as any;
      const { data: pub } = await a
        .from("public_profiles")
        .select("org_id")
        .eq("slug", slug)
        .maybeSingle();
      isOwner = pub?.org_id === orgId;
    }
  } catch { /* not logged in or no org — remain false */ }

  return <ShowcaseClient {...data} isOwner={isOwner} />;
}
