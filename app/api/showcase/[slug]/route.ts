import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = createAdminClient() as any;

  const { data: pub } = await a
    .from("public_profiles")
    .select("org_id, slug, trade, photo_url, service_area")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!pub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: org }, { data: member }] = await Promise.all([
    a.from("orgs").select("name").eq("id", pub.org_id).single(),
    a.from("org_members").select("user_id").eq("org_id", pub.org_id).limit(1).single(),
  ]);

  if (!member?.user_id) return NextResponse.json({ projects: [], contractor: null });

  const { data: homeownerProfile } = await a
    .from("homeowner_profiles")
    .select("id, display_name, avatar_url, banner_url, location, is_profile_public")
    .eq("user_id", member.user_id)
    .maybeSingle();

  if (!homeownerProfile || !homeownerProfile.is_profile_public) {
    return NextResponse.json({ projects: [], contractor: { name: org?.name, slug, trade: pub.trade, location: pub.service_area, photo_url: pub.photo_url } });
  }

  const { data: projects } = await a
    .from("homeowner_projects")
    .select("id, title, contractor_name, description, cost, project_date, completed_date, rating, has_warranty, has_documentation, photos, status")
    .eq("homeowner_id", homeownerProfile.id)
    .order("project_date", { ascending: false, nullsFirst: false });

  const totalInvested = (projects ?? []).reduce((s: number, p: any) => s + (p.cost ?? 0), 0);
  const rated = (projects ?? []).filter((p: any) => p.rating);
  const avgRating = rated.length > 0 ? rated.reduce((s: number, p: any) => s + p.rating, 0) / rated.length : null;

  return NextResponse.json({
    contractor: {
      name: org?.name ?? "Contractor",
      slug,
      trade: pub.trade ?? "",
      location: pub.service_area ?? homeownerProfile.location ?? "",
      photo_url: pub.photo_url ?? homeownerProfile.avatar_url ?? null,
    },
    stats: {
      projectCount: (projects ?? []).length,
      totalInvested,
      avgRating,
    },
    projects: projects ?? [],
  });
}
