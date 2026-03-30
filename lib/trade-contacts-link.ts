import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Given a contact's email, look up whether it belongs to a TradeBase account
 * that has a published public profile.
 *
 * Returns the linked org_id (uuid) if found, or null.
 * Uses a Postgres SECURITY DEFINER function to safely query auth.users.
 *
 * Requires scripts/trade-contacts-link-setup.sql to have been run first.
 */
export async function lookupLinkedOrg(email: string): Promise<string | null> {
  if (!email?.trim()) return null;
  const admin = createAdminClient();
  try {
    const { data, error } = await admin.rpc("match_email_to_org", {
      p_email: email.toLowerCase().trim(),
    });
    if (error || !data) return null;
    return data as string;
  } catch {
    return null;
  }
}
