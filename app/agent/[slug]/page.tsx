import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import AgentProfileClient from "./AgentProfileClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function loadRealtorProfile(slug: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = createAdminClient() as any;

  const { data: profile } = await a
    .from("realtor_profiles")
    .select("display_name,agency_name,license_number,phone,bio,avatar_url,service_area,is_published,slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!profile || !profile.is_published) return null;

  return {
    displayName: (profile.display_name ?? "Realtor") as string,
    agencyName: (profile.agency_name ?? null) as string | null,
    licenseNumber: (profile.license_number ?? null) as string | null,
    phone: (profile.phone ?? null) as string | null,
    bio: (profile.bio ?? null) as string | null,
    avatarUrl: (profile.avatar_url ?? null) as string | null,
    serviceArea: (profile.service_area ?? null) as string | null,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const profile = await loadRealtorProfile(slug);
  if (!profile) notFound();
  return <AgentProfileClient {...profile} />;
}
