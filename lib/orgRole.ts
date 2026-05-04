import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type OrgRole = "owner" | "admin" | "member" | null;

export async function getUserOrgRole(): Promise<{ orgId: string | null; role: OrgRole }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { orgId: null, role: null };

  const admin = createAdminClient();
  const { data } = await admin
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!data) return { orgId: null, role: null };
  return { orgId: data.org_id, role: data.role as OrgRole };
}

export function isOwnerOrAdmin(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}
