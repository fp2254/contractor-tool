import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

function StatCard({ label, value, sub, href }: { label: string; value: number | string; sub?: string; href?: string }) {
  const content = (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-1">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-[#1B3A6B]">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
  if (href) return <Link href={href} className="block hover:opacity-80 transition-opacity">{content}</Link>;
  return content;
}

export default async function AdminOverviewPage() {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const [orgsRes, usersRes, waitlistRes, membershipsRes, subsRes, eventsRes] = await Promise.all([
    (admin as any).from("orgs").select("id, is_demo, created_at", { count: "exact" }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    (admin as any).from("waitlist").select("id", { count: "exact" }).limit(1),
    (admin as any).from("org_memberships").select("id, status", { count: "exact" }).limit(200),
    (admin as any).from("subscriptions").select("id, subscription_status").limit(200),
    (admin as any).from("membership_events").select("id, event_type, actor_email, created_at").order("created_at", { ascending: false }).limit(10),
  ]);

  const orgs: any[] = orgsRes.data ?? [];
  const allUsers: any[] = (usersRes.data as any)?.users ?? [];
  const waitlistCount: number = waitlistRes.count ?? 0;
  const memberships: any[] = membershipsRes.data ?? [];
  const subs: any[] = subsRes.data ?? [];
  const recentEvents: any[] = eventsRes.data ?? [];

  const demoOrgs = orgs.filter((o: any) => o.is_demo).length;
  const realOrgs = orgs.length - demoOrgs;
  const activeMembers = memberships.filter((m: any) => ["active", "trialing", "comped"].includes(m.status)).length;
  const activeSubs = subs.filter((s: any) => s.subscription_status === "active").length;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-800 mt-2">Overview</h1>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Orgs" value={orgs.length} sub={`${realOrgs} real · ${demoOrgs} demo`} href="/app/admin/orgs" />
        <StatCard label="Users" value={allUsers.length} href="/app/admin/users" />
        <StatCard label="Memberships" value={memberships.length} sub={`${activeMembers} with access`} href="/app/admin/memberships" />
        <StatCard label="Waitlist" value={waitlistCount} href="/app/admin/waitlist" />
        <StatCard label="Legacy Subs" value={subs.length} sub={`${activeSubs} active`} href="/app/admin/billing" />
      </div>

      {recentEvents.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-700">Recent Admin Actions</h2>
          <div className="space-y-2">
            {recentEvents.map((ev: any) => (
              <div key={ev.id} className="flex items-start gap-3 text-xs">
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-700">{ev.event_type}</span>
                  {ev.actor_email && <span className="text-gray-400"> by {ev.actor_email}</span>}
                </div>
                <span className="text-gray-400 shrink-0">
                  {new Date(ev.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
          <Link href="/app/admin/system" className="text-xs text-[#1B3A6B] font-semibold">View all activity →</Link>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
        <h2 className="text-sm font-bold text-slate-700">Quick Links</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Manage Memberships", href: "/app/admin/memberships" },
            { label: "Browse Orgs", href: "/app/admin/orgs" },
            { label: "Browse Users", href: "/app/admin/users" },
            { label: "Waitlist Export", href: "/app/admin/waitlist" },
            { label: "Demo Controls", href: "/app/admin/demo" },
            { label: "Legacy Billing", href: "/app/admin/billing" },
          ].map((l) => (
            <Link key={l.href} href={l.href}
              className="rounded-xl border border-gray-100 px-3 py-2.5 text-xs font-semibold text-[#1B3A6B] hover:bg-blue-50 transition-colors">
              {l.label} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
