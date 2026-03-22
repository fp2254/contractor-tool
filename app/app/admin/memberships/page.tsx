import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import MembershipsClient from "./MembershipsClient";

export default async function MembershipsPage() {
  const actor = await requirePlatformAdmin();
  const admin = createAdminClient();

  const [orgsRes, membershipsRes, subsRes, usersRes] = await Promise.all([
    (admin as any).from("orgs").select("id, name, is_demo, created_at, owner_user_id").order("created_at", { ascending: false }),
    (admin as any).from("org_memberships").select("*").order("created_at", { ascending: false }),
    (admin as any).from("subscriptions").select("*"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const orgs: any[] = orgsRes.data ?? [];
  const memberships: any[] = membershipsRes.data ?? [];
  const subs: any[] = subsRes.data ?? [];
  const authUsers: any[] = (usersRes.data as any)?.users ?? [];

  const memByOrg: Record<string, any> = {};
  memberships.forEach((m: any) => { memByOrg[m.org_id] = m; });

  const subByOrg: Record<string, any> = {};
  subs.forEach((s: any) => { subByOrg[s.org_id] = s; });

  const userById: Record<string, any> = {};
  authUsers.forEach((u: any) => { userById[u.id] = u; });

  const rows = orgs.map((org: any) => {
    const mem = memByOrg[org.id] ?? null;
    const sub = subByOrg[org.id] ?? null;
    const owner = org.owner_user_id ? userById[org.owner_user_id] : null;

    return {
      orgId: org.id,
      orgName: org.name,
      isDemo: org.is_demo ?? false,
      orgCreatedAt: org.created_at,
      ownerEmail: owner?.email ?? null,
      ownerName: [owner?.user_metadata?.first_name, owner?.user_metadata?.last_name].filter(Boolean).join(" ") || null,
      lastSignIn: owner?.last_sign_in_at ?? null,
      membership: mem ?? null,
      legacySub: sub ?? null,
    };
  });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-800 mt-2">Memberships</h1>
      <MembershipsClient rows={rows} actorEmail={actor.email} />
    </div>
  );
}
