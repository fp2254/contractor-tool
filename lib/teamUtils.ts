import { createAdminClient } from "@/lib/supabase/admin";

export type TeamMember = {
  userId: string;
  email: string;
  name: string | null;
  role: string;
};

export async function getOrgMembers(orgId: string): Promise<TeamMember[]> {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("org_members")
    .select("user_id, role")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (!members || members.length === 0) return [];

  const userIds = members.map(m => m.user_id);
  const { data: usersRes } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const allUsers = (usersRes as any)?.users ?? [];

  const userMap: Record<string, { email: string; name: string | null }> = {};
  for (const u of allUsers) {
    if (userIds.includes(u.id)) {
      const name = [u.user_metadata?.first_name, u.user_metadata?.last_name]
        .filter(Boolean).join(" ") || null;
      userMap[u.id] = { email: u.email ?? "", name };
    }
  }

  return members.map(m => ({
    userId: m.user_id,
    email: userMap[m.user_id]?.email ?? "Unknown",
    name: userMap[m.user_id]?.name ?? null,
    role: m.role,
  }));
}

export function memberDisplayName(m: { name: string | null; email: string }): string {
  return m.name ?? m.email;
}
