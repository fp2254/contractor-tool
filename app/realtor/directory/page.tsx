import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getRealtorProfileByUserId } from "@/lib/realtor";
import DirectoryClient from "./DirectoryClient";

export default async function RealtorDirectoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/realtor/directory");

  const profile = await getRealtorProfileByUserId(user.id);
  if (!profile) redirect("/realtor");

  const admin = createAdminClient() as any;

  // Fetch published contractor profiles
  const { data: contractors } = await admin
    .from("public_profiles")
    .select("org_id, slug, trade, tagline, phone, service_area, photo_url, years_experience, license_text")
    .eq("is_published", true)
    .order("org_id");

  const orgIds: string[] = (contractors ?? []).map((c: any) => c.org_id);

  // Fetch org names
  let orgNames: Record<string, string> = {};
  if (orgIds.length > 0) {
    const { data: orgs } = await admin.from("orgs").select("id, name").in("id", orgIds);
    orgNames = Object.fromEntries((orgs ?? []).map((o: any) => [o.id, o.name]));
  }

  // Fetch existing connections for this realtor
  let existingConnections: Array<{ org_id: string; status: string; id: string }> = [];
  const { data: conns, error: connsErr } = await admin
    .from("realtor_connections")
    .select("id, org_id, status")
    .eq("realtor_profile_id", profile.id);
  if (!connsErr) existingConnections = conns ?? [];

  const connectionMap = Object.fromEntries(
    existingConnections.map((c) => [c.org_id, { status: c.status, id: c.id }])
  );

  const contractorList = (contractors ?? []).map((c: any) => ({
    org_id: c.org_id,
    slug: c.slug,
    business_name: orgNames[c.org_id] ?? "Contractor",
    trade: c.trade,
    tagline: c.tagline,
    phone: c.phone,
    service_area: c.service_area,
    photo_url: c.photo_url,
    years_experience: c.years_experience,
    license_text: c.license_text,
    connection: connectionMap[c.org_id] ?? null,
  }));

  return <DirectoryClient contractors={contractorList} realtorProfileId={profile.id} />;
}
