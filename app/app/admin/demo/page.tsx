import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminDemoPage() {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data: demoOrg } = await (admin as any)
    .from("orgs")
    .select("id, name, created_at")
    .eq("is_demo", true)
    .maybeSingle();

  let demoUser: any = null;
  if (demoOrg) {
    const { data: members } = await (admin as any)
      .from("org_members")
      .select("user_id")
      .eq("org_id", demoOrg.id)
      .limit(1);
    if (members?.length) {
      const { data: u } = await admin.auth.admin.getUserById(members[0].user_id);
      demoUser = u?.user ?? null;
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-800 mt-2">Demo</h1>

      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-700">Demo Org</h2>
        {demoOrg ? (
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-400">Org:</span> <span className="font-semibold text-slate-700">{demoOrg.name}</span></p>
            <p><span className="text-gray-400">ID:</span> <span className="font-mono text-xs text-slate-600">{demoOrg.id}</span></p>
            {demoUser && (
              <>
                <p><span className="text-gray-400">Demo Email:</span> <span className="font-semibold text-slate-700">{demoUser.email}</span></p>
                <p><span className="text-gray-400">Last Sign-in:</span> <span className="text-slate-600">{demoUser.last_sign_in_at ? new Date(demoUser.last_sign_in_at).toLocaleString() : "Never"}</span></p>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No demo org found. Set <code className="bg-gray-100 px-1 rounded">is_demo = true</code> on an org in Supabase to designate it as the demo org.</p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-700">Demo Credentials</h2>
        <div className="space-y-1 text-sm">
          <p><span className="text-gray-400">Email:</span> <span className="font-mono font-semibold text-slate-700">demo@trade-base.biz</span></p>
          <p><span className="text-gray-400">Password:</span> <span className="font-mono font-semibold text-slate-700">TradeBaseDemo2024!</span></p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-bold text-amber-800">Re-seed / Reset Demo Data</h2>
        <p className="text-xs text-amber-700">
          Automated demo re-seeding is not yet wired to a UI action. To reset demo data, run the seed script manually via Supabase Studio or a one-off script.
        </p>
        <p className="text-xs text-amber-600 font-semibold">
          Coming soon: one-tap reset from this panel.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
        <h2 className="text-sm font-bold text-slate-700">Demo Mode Check</h2>
        <p className="text-xs text-gray-500">
          Demo mode is active when an org has <code className="bg-gray-100 px-1 rounded text-[11px]">is_demo = true</code>.
          The demo banner and all demo restrictions are applied by <code className="bg-gray-100 px-1 rounded text-[11px]">app/app/layout.tsx</code>.
        </p>
        <p className="text-xs text-green-600 font-semibold">
          {demoOrg ? `✓ Demo org is configured (${demoOrg.name})` : "✕ No demo org found"}
        </p>
      </div>
    </div>
  );
}
