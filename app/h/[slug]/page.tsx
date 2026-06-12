import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import HomeownerShowcaseClient from "./HomeownerShowcaseClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

// ── Demo profile so you can preview the page at /h/john-sarah-thompson ──────
const DEMO_DATA = {
  profile: {
    displayName: "John & Sarah Thompson",
    avatarUrl: "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=200&h=200&fit=crop&crop=faces",
    bannerUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=300&fit=crop",
    location: "Westborough, MA",
    isPublic: true,
    memberSince: "2024-01-15",
    slug: "john-sarah-thompson",
  },
  property: {
    property_type: "Single Family Home",
    sq_footage: 2450,
    lot_size: "0.46 acres",
    year_built: 1998,
    bedrooms: 4,
    bathrooms: 2.5,
    updated_at: "2026-06-15",
  },
  projects: [
    {
      id: "d1", title: "New Roof Installation", contractor_name: "Horizon Roofing",
      description: "Complete roof tear-off and installation of GAF Timberline HDZ shingles.",
      review_text: "Frank showed up on time, explained everything clearly, and did excellent work. Highly recommend!",
      cost: 12400, project_date: "2026-06-14", completed_date: "2026-06-14",
      rating: 5, has_warranty: true, has_documentation: false,
      photos: [
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop",
      ],
      status: "completed",
    },
    {
      id: "d2", title: "Radon Mitigation System", contractor_name: "Central Maine Radon",
      description: "Installed radon mitigation system and completed post-installation testing.",
      review_text: null, cost: 1960, project_date: "2026-04-22", completed_date: "2026-04-22",
      rating: 5, has_warranty: false, has_documentation: true,
      photos: [
        "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=300&fit=crop",
      ],
      status: "completed",
    },
    {
      id: "d3", title: "Kitchen Remodel", contractor_name: "Oak & Stone Builders",
      description: "Complete kitchen renovation including cabinets, countertops, flooring, and lighting.",
      review_text: "Great communication, finished on time, and the work looks amazing. Crew was professional and respectful.",
      cost: 38300, project_date: "2026-03-28", completed_date: "2026-03-28",
      rating: 4.9, has_warranty: false, has_documentation: true,
      photos: [
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=400&h=300&fit=crop",
      ],
      status: "completed",
    },
    {
      id: "d4", title: "Landscaping & Lawn Overhaul", contractor_name: "GreenScape Pro",
      description: "Full yard regrading, sod installation, irrigation system, and garden bed design.",
      review_text: "Transformed our yard completely. Crew was respectful and cleaned up perfectly.",
      cost: 8750, project_date: "2025-09-10", completed_date: "2025-09-10",
      rating: 4.8, has_warranty: false, has_documentation: false,
      photos: [
        "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
      ],
      status: "completed",
    },
    {
      id: "d5", title: "Basement Finishing", contractor_name: "Oak & Stone Builders",
      description: "Finished unfinished basement into a rec room, home office, and half bath.",
      review_text: null, cost: 23150, project_date: "2025-02-14", completed_date: "2025-02-14",
      rating: 4.7, has_warranty: true, has_documentation: true,
      photos: [
        "https://images.unsplash.com/photo-1565117447851-6cfa4b27c9a5?w=400&h=300&fit=crop",
      ],
      status: "completed",
    },
  ],
  futureProjects: [
    { id: "f1", title: "New Deck", status: "planning", cover_image_url: "https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?w=200&h=140&fit=crop", notes: "Looking to add a 16x20 composite deck off the back door." },
    { id: "f2", title: "Bathroom Remodel", status: "researching", cover_image_url: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=200&h=140&fit=crop", notes: null },
    { id: "f3", title: "Fence Installation", status: "planning", cover_image_url: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=140&fit=crop", notes: null },
    { id: "f4", title: "Driveway Paving", status: "researching", cover_image_url: "https://images.unsplash.com/photo-1558618047-3c8c76ca8b6a?w=200&h=140&fit=crop", notes: null },
  ],
  scorecard: [
    { category: "Roof",       score_status: "excellent" },
    { category: "Plumbing",   score_status: "good" },
    { category: "Electrical", score_status: "good" },
    { category: "HVAC",       score_status: "good" },
    { category: "Radon",      score_status: "mitigated" },
    { category: "Deck",       score_status: "needs_attention" },
  ],
  stats: { projectCount: 5, totalInvested: 84560, avgRating: 4.88, contractorsWorked: 4 },
};

async function loadShowcase(slug: string) {
  // Return demo data for the preview slug
  if (slug === "john-sarah-thompson") return DEMO_DATA;

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
