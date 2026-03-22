import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { notFound } from "next/navigation";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700", trialing: "bg-blue-100 text-blue-700",
  comped: "bg-purple-100 text-purple-700", past_due: "bg-amber-100 text-amber-700",
  paused: "bg-gray-100 text-gray-500", canceled: "bg-red-100 text-red-600",
  expired: "bg-red-50 text-red-400", none: "bg-gray-100 text-gray-400",
};

type Params = { params: Promise<{ id: string }> };

export default async function MembershipDetailPage({ params }: Params) {
  await requirePlatformAdmin();
  const { id: orgId } = await params;
  const admin = createAdminClient();

  const [orgRes, memRes, eventsRes, membersRes, usersRes] = await Promise.all([
    (admin as any).from("orgs").select("*").eq("id", orgId).maybeSingle(),
    (admin as any).from("org_memberships").select("*").eq("org_id", orgId).maybeSingle(),
    (admin as any).from("membership_events").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(50),
    (admin as any).from("org_members").select("user_id, role").eq("org_id", orgId),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const org = orgRes.data;
  if (!org) notFound();

  const mem = memRes.data;
  const events: any[] = eventsRes.data ?? [];
  const members: any[] = membersRes.data ?? [];
  const allUsers: any[] = (usersRes.data as any)?.users ?? [];
  const userById: Record<string, any> = {};
  allUsers.forEach((u: any) => { userById[u.id] = u; });

  const memberUsers = members.map((m: any) => ({ ...m, user: userById[m.user_id] ?? null }));

  const EVENT_COLORS: Record<string, string> = {
    cancel: "text-red-600", reactivate: "text-green-600", mark_active: "text-green-600",
    comp: "text-purple-600", comp_indefinitely: "text-purple-600", extend: "text-blue-600",
    change_plan: "text-slate-700", change_status: "text-slate-700", pause: "text-gray-500",
    mark_past_due: "text-amber-600", add_note: "text-gray-400",
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/app/admin/memberships" className="text-xs text-[#1B3A6B] font-semibold">← Memberships</Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-slate-800">{org.name}</h1>
              {org.is_demo && <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-semibold">DEMO</span>}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">ID: {org.id}</p>
            <p className="text-xs text-gray-400">Created: {fmtDate(org.created_at)}</p>
          </div>
          <Link href={`/app/admin/memberships?q=${encodeURIComponent(org.name)}`}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-gray-200 text-slate-600">
            Back to list
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-700">Membership</h2>
        {mem ? (
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { label: "Plan", value: mem.plan ?? "—" },
              { label: "Status", value: mem.status, badge: true },
              { label: "Period Start", value: fmtDate(mem.current_period_start) },
              { label: "Period End", value: fmtDate(mem.current_period_end) },
              { label: "Trial Ends", value: fmtDate(mem.trial_ends_at) },
              { label: "Comped Until", value: mem.status === "comped" ? (mem.comped_until ? fmtDate(mem.comped_until) : "∞ Indefinite") : "—" },
              { label: "Canceled At", value: fmtDate(mem.canceled_at) },
              { label: "Paused At", value: fmtDate(mem.paused_at) },
              { label: "Started", value: fmtDate(mem.started_at) },
              { label: "Updated", value: fmtDate(mem.updated_at) },
            ].map(({ label, value, badge }) => (
              <div key={label}>
                <p className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">{label}</p>
                {badge ? (
                  <span className={`inline-block mt-0.5 text-[10px] font-bold rounded-full px-2 py-0.5 ${STATUS_BADGE[value as string] ?? STATUS_BADGE.none}`}>{value}</span>
                ) : (
                  <p className="text-slate-700 mt-0.5">{value as string}</p>
                )}
              </div>
            ))}
            {mem.billing_provider && (
              <>
                <div>
                  <p className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Billing Provider</p>
                  <p className="text-slate-700 mt-0.5">{mem.billing_provider}</p>
                </div>
                {mem.billing_provider_subscription_id && (
                  <div>
                    <p className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Sub ID</p>
                    <p className="text-slate-700 mt-0.5 font-mono text-[10px]">{mem.billing_provider_subscription_id}</p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No org_memberships record. Use Actions from the list to create one.</p>
        )}
        {mem?.admin_notes && (
          <div className="mt-2 pt-3 border-t border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Admin Notes</p>
            <p className="text-sm text-slate-600 italic">{mem.admin_notes}</p>
          </div>
        )}
        <Link href="/app/admin/memberships"
          className="inline-flex items-center gap-1 text-xs font-semibold rounded-lg px-3 py-2 text-white mt-2"
          style={{ backgroundColor: "#1B3A6B" }}>
          Manage Actions →
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-700">Users in this Org</h2>
        {memberUsers.length === 0 ? (
          <p className="text-sm text-gray-400">No users found.</p>
        ) : (
          <div className="space-y-2">
            {memberUsers.map((m: any) => (
              <div key={m.user_id} className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-700">{m.user?.email ?? m.user_id}</p>
                  <p className="text-gray-400">Role: {m.role} · Last sign-in: {fmtDate(m.user?.last_sign_in_at)}</p>
                </div>
                <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{m.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-700">Audit History ({events.length})</h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-400">No membership events recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {events.map((ev: any) => (
              <div key={ev.id} className="flex items-start gap-3 text-xs border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <span className={`font-bold ${EVENT_COLORS[ev.event_type] ?? "text-slate-700"}`}>{ev.event_type}</span>
                  {ev.old_status && ev.new_status && (
                    <span className="text-gray-400"> · {ev.old_status} → {ev.new_status}</span>
                  )}
                  {ev.old_plan && ev.new_plan && (
                    <span className="text-gray-400"> · {ev.old_plan} → {ev.new_plan}</span>
                  )}
                  {ev.days_added && <span className="text-blue-600"> · +{ev.days_added} days</span>}
                  {ev.note && <p className="text-gray-400 italic mt-0.5">"{ev.note}"</p>}
                  {ev.actor_email && <p className="text-gray-300 mt-0.5">by {ev.actor_email}</p>}
                </div>
                <span className="text-gray-400 shrink-0 whitespace-nowrap">{fmtDate(ev.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
