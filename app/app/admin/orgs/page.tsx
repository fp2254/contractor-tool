import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import OrgsClient from "./OrgsClient";

export default async function AdminOrgsPage() {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const [orgsRes, membersRes, membershipsRes, usersRes] = await Promise.all([
    (admin as any).from("orgs").select("id, name, is_demo, created_at, owner_user_id").order("created_at", { ascending: false }),
    (admin as any).from("org_members").select("org_id, user_id"),
    (admin as any).from("org_memberships").select("org_id, plan, status"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const orgs: any[] = orgsRes.data ?? [];
  const members: any[] = membersRes.data ?? [];
  const memberships: any[] = membershipsRes.data ?? [];
  const allUsers: any[] = (usersRes.data as any)?.users ?? [];

  const userById: Record<string, any> = {};
  allUsers.forEach((u: any) => { userById[u.id] = u; });

  const userCountByOrg: Record<string, number> = {};
  members.forEach((m: any) => {
    userCountByOrg[m.org_id] = (userCountByOrg[m.org_id] ?? 0) + 1;
  });

  const memByOrg: Record<string, any> = {};
  memberships.forEach((m: any) => { memByOrg[m.org_id] = m; });

  const rows = orgs.map((org: any) => ({
    id: org.id,
    name: org.name,
    isDemo: org.is_demo ?? false,
    createdAt: org.created_at,
    ownerEmail: org.owner_user_id ? (userById[org.owner_user_id]?.email ?? null) : null,
    userCount: userCountByOrg[org.id] ?? 0,
    membership: memByOrg[org.id] ?? null,
  }));

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-800 mt-2">Orgs ({orgs.length})</h1>
      <OrgsClient rows={rows} />
    </div>
  );
}
