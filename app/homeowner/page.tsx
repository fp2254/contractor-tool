import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

export default async function HomeownerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/homeowner");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = createAdminClient() as any;

  const { data: profile } = await a
    .from("homeowner_profiles")
    .select("id,display_name,avatar_url,banner_url,location,is_verified,is_profile_public,member_since")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/auth/login");

  const [projectsRes, futureRes, scorecardRes, propertyRes] = await Promise.all([
    a.from("homeowner_projects")
      .select("id,title,contractor_name,description,review_text,cost,project_date,completed_date,rating,has_warranty,has_documentation,photos,status")
      .eq("homeowner_id", profile.id)
      .order("project_date", { ascending: false })
      .limit(50),
    a.from("homeowner_future_projects")
      .select("id,title,status,cover_image_url")
      .eq("homeowner_id", profile.id)
      .order("created_at", { ascending: true }),
    a.from("homeowner_scorecard")
      .select("category,score_status")
      .eq("homeowner_id", profile.id),
    a.from("homeowner_properties")
      .select("property_type,sq_footage,lot_size,year_built,bedrooms,bathrooms,updated_at")
      .eq("homeowner_id", profile.id)
      .single(),
  ]);

  return (
    <ProfileClient
      profile={{
        id: profile.id,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        bannerUrl: profile.banner_url,
        location: profile.location,
        isVerified: profile.is_verified,
        isPublic: profile.is_profile_public,
        memberSince: profile.member_since,
      }}
      property={propertyRes.data ?? null}
      projects={projectsRes.data ?? []}
      futureProjects={futureRes.data ?? []}
      scorecard={scorecardRes.data ?? []}
    />
  );
}
