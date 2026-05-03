import { requirePlatformAdmin } from "@/lib/admin";
import { isPlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import UsersClient from "./UsersClient";

export default async function AdminUsersPage() {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const [usersRes, membersRes, orgsRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    (admin as any).from("org_members").select("user_id, org_id, role"),
    (admin as any).from("orgs").select("id, name"),
  ]);

  const allUsers: any[] = (usersRes.data as any)?.users ?? [];
  const members: any[] = membersRes.data ?? [];
  const orgs: any[] = orgsRes.data ?? [];

  const orgById: Record<string, string> = {};
  orgs.forEach((o: any) => { orgById[o.id] = o.name; });

  const orgsByUser: Record<string, { orgId: string; orgName: string; role: string }[]> = {};
  members.forEach((m: any) => {
    if (!orgsByUser[m.user_id]) orgsByUser[m.user_id] = [];
    orgsByUser[m.user_id].push({ orgId: m.org_id, orgName: orgById[m.org_id] ?? m.org_id, role: m.role });
  });

  const rows = allUsers.map((u: any) => ({
    id: u.id,
    email: u.email ?? "",
    name: [u.user_metadata?.first_name, u.user_metadata?.last_name].filter(Boolean).join(" ") || null,
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at ?? null,
    isPlatformAdmin: isPlatformAdmin(u.email),
    banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
    orgs: orgsByUser[u.id] ?? [],
  }));

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-800 mt-2">Users ({allUsers.length})</h1>
      <UsersClient rows={rows} />
    </div>
  );
}
