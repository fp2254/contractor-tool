import { redirect } from "next/navigation";
import Link from "next/link";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAddonStatus } from "@/lib/addons";
import { PhoneCallLog, ProvisionButton, GetPhoneButton, ActivationPendingBanner, CopyNumberButton, BillingCard } from "./PhoneClient";

export const dynamic = "force-dynamic";

function formatPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const n = digits.slice(1);
    return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
  }
  return e164;
}

export default async function PhonePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const activated = params.activated === "1";

  const orgId = await ensureUserOrg();
  if (!orgId) redirect("/auth/login");

  const addon = await getAddonStatus(orgId, "phone_ai");
  const admin = createAdminClient();

  // Previously subscribed but now canceled / expired / paused / payment issue
  const hadSubscription =
    addon.status === "canceled" ||
    addon.status === "paused" ||
    addon.status === "past_due" ||
    addon.status === "unpaid" ||
    !!addon.externalSubscriptionId;

  if (!addon.active && hadSubscription) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <div className="flex items-center gap-3 p-4">
          <Link href="/app/more" className="text-gray-400">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-slate-800">AI Phone</h1>
        </div>

        <div className="flex-1 flex flex-col p-4 pb-10 space-y-4">
          <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
            <div className="text-4xl mb-3">📞</div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Your AI Phone subscription has ended</h2>
            <p className="text-sm text-gray-500">Resubscribe to get your business number back and resume call handling.</p>
          </div>

          <BillingCard
            currentPeriodEnd={addon.currentPeriodEnd}
            priceMonthly={addon.priceMonthly}
            status={addon.status}
            hasSubscriptionId={!!addon.externalSubscriptionId}
          />
        </div>
      </div>
    );
  }

  if (!addon.active) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <div className="flex items-center gap-3 p-4">
          <Link href="/app/more" className="text-gray-400">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-slate-800">AI Phone</h1>
        </div>

        <div className="flex-1 flex flex-col p-4 pb-10 space-y-4">
          {/* Hero */}
          <div className="rounded-3xl overflow-hidden text-white p-6 text-center" style={{ background: "linear-gradient(135deg, #1B3A6B 0%, #2d5ab5 100%)" }}>
            <div className="text-5xl mb-3">📞</div>
            <h2 className="text-2xl font-bold mb-2">AI Phone Receptionist</h2>
            <p className="text-blue-100 text-sm leading-relaxed">
              Never miss a lead again. Your dedicated business phone number with an AI that answers every call, takes messages, and saves transcripts to your CRM.
            </p>
          </div>

          {/* Feature list */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {[
              { icon: "📱", title: "Dedicated Business Number", desc: "A real US phone number just for your business — forward it from your website, cards, or ads." },
              { icon: "🤖", title: "AI Answers Every Call", desc: "Your AI receptionist greets callers professionally, takes their name and message, and lets them know you'll call back." },
              { icon: "📋", title: "Auto Transcripts & Summaries", desc: "Every call is transcribed by AI and saved to your CRM. Missed a call? Read what the caller said in seconds." },
              { icon: "💬", title: "Missed-Call SMS", desc: "Auto-texts anyone you don't pick up so they know you'll be in touch." },
              { icon: "🔀", title: "Flexible Routing", desc: "Ring your phone first, go straight to AI, ring both, or let AI handle after-hours." },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 last:border-0">
                <span className="text-2xl flex-shrink-0">{f.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{f.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-slate-800">$29<span className="text-base font-normal text-gray-400">/mo</span></p>
            <p className="text-sm text-gray-500 mt-1">Cancel anytime · No setup fees · Instant activation</p>
          </div>

          {/* CTA: Lemon Squeezy checkout or pending banner */}
          {activated ? (
            <ActivationPendingBanner />
          ) : (
            <GetPhoneButton />
          )}

          <p className="text-xs text-center text-gray-400 px-4">
            Secure checkout powered by Lemon Squeezy. Cancel anytime from your account.
          </p>
        </div>
      </div>
    );
  }

  // Addon is active — fetch phone number
  const { data: phoneRow } = await (admin as any)
    .from("org_phone_numbers")
    .select("id,e164_number,retell_agent_id,status,created_at")
    .eq("org_id", orgId)
    .maybeSingle();

  // Fetch call stats
  let stats = { callsToday: 0, missedToday: 0, avgDurationThisWeek: null as string | null };
  if (phoneRow) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const [{ data: todayCalls }, { data: weekCalls }] = await Promise.all([
      (admin as any)
        .from("call_logs")
        .select("id,answered_by")
        .eq("org_id", orgId)
        .gte("started_at", today.toISOString()),
      (admin as any)
        .from("call_logs")
        .select("duration_seconds")
        .eq("org_id", orgId)
        .gte("started_at", weekStart.toISOString())
        .not("duration_seconds", "is", null)
        .gt("duration_seconds", 0),
    ]);

    if (todayCalls) {
      stats.callsToday = todayCalls.length;
      stats.missedToday = todayCalls.filter((c: any) => !c.answered_by).length;
    }

    if (weekCalls && weekCalls.length > 0) {
      const total = weekCalls.reduce((s: number, c: any) => s + (c.duration_seconds ?? 0), 0);
      const avg = Math.round(total / weekCalls.length);
      const mins = Math.floor(avg / 60);
      const secs = avg % 60;
      stats.avgDurationThisWeek = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }
  }

  // Recent calls
  const { data: calls } = await (admin as any)
    .from("call_logs")
    .select(`id, direction, from_number, to_number, status, duration_seconds,
             recording_url, caller_name, answered_by, routing_mode_used,
             missed_call_sms_sent, started_at, ended_at,
             call_transcripts(ai_summary, sentiment)`)
    .eq("org_id", orgId)
    .order("started_at", { ascending: false })
    .limit(30);

  const nextCursor = calls && calls.length === 30 ? calls[29].started_at : null;

  if (!phoneRow) {
    return (
      <div className="p-4 pb-10 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/app/more" className="text-gray-400">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-slate-800">AI Phone</h1>
          <span className="ml-auto text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">Active</span>
        </div>

        <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {activated ? "Payment confirmed — setting up your number!" : "You're all set — let's get your number!"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            We'll buy a dedicated US phone number and configure your AI receptionist in about 10 seconds.
          </p>
          <ProvisionButton autoStart={activated} />
        </div>

        <BillingCard
          currentPeriodEnd={addon.currentPeriodEnd}
          priceMonthly={addon.priceMonthly}
          status={addon.status}
          hasSubscriptionId={!!addon.externalSubscriptionId}
        />
      </div>
    );
  }

  // Full dashboard
  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/app/more" className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">AI Phone</h1>
        </div>
        <Link href="/app/phone/settings"
          className="text-xs font-semibold text-[#1B3A6B] bg-blue-50 px-3 py-1.5 rounded-full">
          Settings
        </Link>
      </div>

      {/* Activated success banner */}
      {activated && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-semibold text-green-800">You&apos;re live!</p>
            <p className="text-xs text-green-600 mt-0.5">Your AI phone receptionist is active and ready to take calls.</p>
          </div>
        </div>
      )}

      {/* Phone number card */}
      <div className="rounded-2xl text-white p-4" style={{ backgroundColor: "#1B3A6B" }}>
        <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-1">Your Business Number</p>
        <p className="text-3xl font-bold tracking-wide">{formatPhone(phoneRow.e164_number)}</p>
        <p className="text-xs text-blue-200 mt-2">AI Receptionist active · Share this number with customers</p>
        <div className="flex gap-2 mt-3">
          <CopyNumberButton phoneNumber={phoneRow.e164_number} />
          <Link href="/app/phone/settings"
            className="text-xs font-semibold bg-white/20 text-white px-3 py-1.5 rounded-full">
            ⚙ Configure
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-800">{stats.callsToday}</p>
          <p className="text-[10px] font-semibold text-gray-400 mt-0.5">Calls Today</p>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <p className={`text-2xl font-bold ${stats.missedToday > 0 ? "text-red-600" : "text-slate-800"}`}>{stats.missedToday}</p>
          <p className="text-[10px] font-semibold text-gray-400 mt-0.5">Missed Today</p>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-blue-700 leading-tight mt-1">{stats.avgDurationThisWeek ?? "—"}</p>
          <p className="text-[10px] font-semibold text-gray-400 mt-0.5">Avg Duration This Week</p>
        </div>
      </div>

      {/* Billing */}
      <BillingCard
        currentPeriodEnd={addon.currentPeriodEnd}
        priceMonthly={addon.priceMonthly}
        status={addon.status}
        hasSubscriptionId={!!addon.externalSubscriptionId}
      />

      {/* Call log */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Call History</p>
        <PhoneCallLog
          initialCalls={calls ?? []}
          nextCursor={nextCursor}
          phoneNumber={phoneRow.e164_number}
        />
      </div>
    </div>
  );
}
