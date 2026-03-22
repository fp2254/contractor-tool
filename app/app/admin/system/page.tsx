import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const EVENT_COLORS: Record<string, string> = {
  cancel: "text-red-600", reactivate: "text-green-600", mark_active: "text-green-600",
  comp: "text-purple-600", comp_indefinitely: "text-purple-600", extend: "text-blue-600",
  change_plan: "text-slate-700", change_status: "text-slate-700", pause: "text-gray-500",
  mark_past_due: "text-amber-600", add_note: "text-gray-400",
};

export default async function AdminSystemPage() {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const [eventsRes, orgsRes, subsRes] = await Promise.all([
    (admin as any).from("membership_events").select("*").order("created_at", { ascending: false }).limit(50),
    (admin as any).from("orgs").select("id", { count: "exact" }).limit(1),
    (admin as any).from("subscriptions").select("subscription_status").limit(500),
  ]);

  const events: any[] = eventsRes.data ?? [];
  const totalOrgs: number = orgsRes.count ?? 0;
  const subs: any[] = subsRes.data ?? [];
  const activeSubs = subs.filter((s: any) => s.subscription_status === "active").length;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-800 mt-2">System</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Total Orgs</p>
          <p className="text-2xl font-bold text-[#1B3A6B]">{totalOrgs}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Active Subs</p>
          <p className="text-2xl font-bold text-[#1B3A6B]">{activeSubs}</p>
          <p className="text-xs text-gray-400">legacy subscriptions</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-700">Membership Event Log ({events.length})</h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-400">No membership events recorded yet. Actions you take in the Memberships section will appear here.</p>
        ) : (
          <div className="space-y-2">
            {events.map((ev: any) => (
              <div key={ev.id} className="flex items-start gap-3 text-xs border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <span className={`font-bold ${EVENT_COLORS[ev.event_type] ?? "text-slate-700"}`}>{ev.event_type}</span>
                  {" · "}
                  <span className="text-gray-500 font-mono text-[10px]">{ev.org_id}</span>
                  {ev.old_status && ev.new_status && (
                    <span className="text-gray-400"> · {ev.old_status} → {ev.new_status}</span>
                  )}
                  {ev.note && <p className="text-gray-400 italic mt-0.5">"{ev.note}"</p>}
                  {ev.actor_email && <p className="text-gray-300 mt-0.5">by {ev.actor_email}</p>}
                </div>
                <span className="text-gray-400 shrink-0 whitespace-nowrap">{fmtDate(ev.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
        <h2 className="text-sm font-bold text-slate-700">Feature Flags</h2>
        <p className="text-xs text-gray-400">Feature flag management is a placeholder. Connect a flags table or LaunchDarkly here in a future iteration.</p>
        <div className="space-y-1.5">
          {[
            { flag: "real_signup", label: "Real Signup Flow", status: "off", note: "Currently demo-only; wire Step 3 to Supabase auth.signUp() to enable" },
            { flag: "stripe_billing", label: "Stripe Billing", status: "off", note: "Not yet integrated; org_memberships ready for billing_provider sync" },
            { flag: "membership_gating", label: "Membership Access Gating", status: "partial", note: "lib/membership.ts built; not yet wired into app layout (uses legacy subscription check)" },
          ].map((f) => (
            <div key={f.flag} className="flex items-start gap-3 text-xs py-2 border-b border-gray-50 last:border-0">
              <span className={`shrink-0 font-bold px-2 py-0.5 rounded-full ${f.status === "on" ? "bg-green-100 text-green-700" : f.status === "partial" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400"}`}>
                {f.status}
              </span>
              <div>
                <p className="font-semibold text-slate-700">{f.label}</p>
                <p className="text-gray-400 mt-0.5">{f.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
        <h2 className="text-sm font-bold text-slate-700">Placeholders</h2>
        <div className="space-y-1 text-xs text-gray-400">
          <p>📧 <strong className="text-slate-600">Email Log</strong> — log outbound emails (Resend events) here</p>
          <p>🤖 <strong className="text-slate-600">AI Usage</strong> — log OpenAI token usage per org here</p>
          <p>⚠️ <strong className="text-slate-600">Error Log</strong> — surface app errors per org here</p>
        </div>
      </div>
    </div>
  );
}
