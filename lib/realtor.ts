import { createAdminClient } from "@/lib/supabase/admin";

export type RealtorProfile = {
  id: string;
  user_id: string;
  display_name: string;
  agency_name: string | null;
  license_number: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  service_area: string | null;
  slug: string | null;
  is_published: boolean;
  profile_completion: number;
  years_experience?: number | null;
  homes_sold?: number | null;
  sales_volume?: number | null;
  banner_url?: string | null;
};

function slugifyName(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

async function findUniqueSlug(base: string): Promise<string> {
  const admin = createAdminClient() as any;
  let slug = base || "agent";
  let attempt = 0;
  while (true) {
    const { data: taken } = await admin
      .from("realtor_profiles")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!taken) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
    if (attempt > 20) return `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
}

/**
 * Provisions a realtor_profiles row for the given user on first visit.
 * Mirrors the homeowner_profiles provisioning pattern — realtors are a
 * completely separate account type from contractor orgs (no org_members row
 * is ever created for them).
 */
export async function ensureRealtorProfile(
  userId: string,
  fallbackName?: string | null
): Promise<RealtorProfile | null> {
  const admin = createAdminClient() as any;

  const { data: existing } = await admin
    .from("realtor_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing as RealtorProfile;

  const displayName = fallbackName?.trim() || "New Realtor";

  const { data: created, error } = await admin
    .from("realtor_profiles")
    .insert({ user_id: userId, display_name: displayName })
    .select("*")
    .single();

  if (error) {
    // Table may not exist yet if migration_realtor.sql hasn't been applied.
    return null;
  }

  return created as RealtorProfile;
}

export async function getRealtorProfileByUserId(userId: string): Promise<RealtorProfile | null> {
  const admin = createAdminClient() as any;
  const { data } = await admin
    .from("realtor_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as RealtorProfile) ?? null;
}

export async function publishRealtorSlug(profileId: string, desiredName: string): Promise<string> {
  const base = slugifyName(desiredName) || "agent";
  const slug = await findUniqueSlug(base);
  const admin = createAdminClient() as any;
  await admin.from("realtor_profiles").update({ slug }).eq("id", profileId);
  return slug;
}

export function computeProfileCompletion(profile: Partial<RealtorProfile>): number {
  const fields = [profile.display_name, profile.agency_name, profile.phone, profile.bio, profile.avatar_url, profile.license_number];
  const filled = fields.filter((f) => f && f.trim().length > 0).length;
  return Math.round((filled / fields.length) * 100);
}
