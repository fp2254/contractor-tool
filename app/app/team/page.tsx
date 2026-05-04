import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import TeamClient from "./TeamClient";

export default async function TeamPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const { data: members } = await admin
    .from("org_members")
    .select("id, user_id, role, created_at")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: true });

  const userIds = (members ?? []).map(m => m.user_id);

  let userMap: Record<string, { email: string; name: string | null }> = {};
  if (userIds.length > 0) {
    const { data: usersRes } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const allUsers = (usersRes as any)?.users ?? [];
    for (const u of allUsers) {
      if (userIds.includes(u.id)) {
        const name = [u.user_metadata?.first_name, u.user_metadata?.last_name]
          .filter(Boolean).join(" ") || null;
        userMap[u.id] = { email: u.email ?? "", name };
      }
    }
  }

  const rows = (members ?? []).map(m => ({
    id: m.id,
    userId: m.user_id,
    role: m.role as string,
    createdAt: m.created_at as string,
    email: userMap[m.user_id]?.email ?? "Unknown",
    name: userMap[m.user_id]?.name ?? null,
  }));

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Team</h1>
      <TeamClient members={rows} />
    </div>
  );
}
