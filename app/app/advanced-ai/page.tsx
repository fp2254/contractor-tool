import { redirect } from "next/navigation";
import Link from "next/link";
import { ensureUserOrg } from "@/lib/auth";
import { getAddonStatus } from "@/lib/addons";
import { AdvancedAiCheckoutButton } from "./AdvancedAiClient";
import { BillingCard } from "@/components/BillingCard";

export const dynamic = "force-dynamic";

export default async function AdvancedAiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const activated = params.activated === "1";

  const orgId = await ensureUserOrg();
  if (!orgId) redirect("/auth/login");

  const addon = await getAddonStatus(orgId, "advanced_ai");

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
          <h1 className="text-xl font-bold text-slate-800">Advanced AI</h1>
        </div>

        <div className="flex-1 flex flex-col p-4 pb-10 space-y-4">
          <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
            <div className="text-4xl mb-3">🤖</div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Your Advanced AI subscription has ended</h2>
            <p className="text-sm text-gray-500">Resubscribe to unlock unlimited AI requests and priority processing.</p>
          </div>

          <BillingCard
            addonName="Advanced AI"
            addonType="advanced_ai"
            currentPeriodEnd={addon.currentPeriodEnd}
            priceMonthly={addon.priceMonthly ?? 19}
            status={addon.status}
            hasSubscriptionId={!!addon.externalSubscriptionId}
          />
        </div>
      </div>
    );
  }

  if (addon.active) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <div className="flex items-center gap-3 p-4">
          <Link href="/app/more" className="text-gray-400">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-slate-800">Advanced AI</h1>
        </div>

        <div className="flex-1 flex flex-col p-4 pb-10 space-y-4">
          {activated && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="text-green-600 font-bold text-sm">Advanced AI is now active!</span>
            </div>
          )}

          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🤖</span>
              <div>
                <p className="text-base font-bold text-slate-800">Advanced AI — Active</p>
                <p className="text-xs text-gray-400">Unlimited requests · Priority processing</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">What&apos;s Included</p>
            </div>
            {[
              { icon: "♾️", label: "Unlimited AI requests per day" },
              { icon: "⚡", label: "Priority processing — faster responses" },
              { icon: "👁️", label: "GPT vision — scan receipts & price sheets" },
              { icon: "🧠", label: "Advanced job scoping & client intel" },
              { icon: "📝", label: "Longer note & ops summaries" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                <span className="text-lg">{icon}</span>
                <span className="text-sm text-slate-700">{label}</span>
              </div>
            ))}
          </div>

          <BillingCard
            addonName="Advanced AI"
            addonType="advanced_ai"
            currentPeriodEnd={addon.currentPeriodEnd}
            priceMonthly={addon.priceMonthly ?? 19}
            status={addon.status}
            hasSubscriptionId={!!addon.externalSubscriptionId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="flex items-center gap-3 p-4">
        <Link href="/app/more" className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-slate-800">Advanced AI</h1>
      </div>

      <div className="flex-1 flex flex-col p-4 pb-10 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
          <div className="text-center">
            <div className="text-5xl mb-3">🤖</div>
            <h2 className="text-lg font-bold text-slate-800">Unlock Advanced AI</h2>
            <p className="text-sm text-gray-500 mt-1">
              Remove daily limits and get priority access to every AI feature.
            </p>
          </div>

          <div className="rounded-xl bg-blue-50 px-4 py-3 text-center">
            <span className="text-2xl font-bold text-[#1B3A6B]">$19</span>
            <span className="text-sm text-gray-500">/mo</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Everything Included</p>
          </div>
          {[
            { icon: "♾️", label: "Unlimited AI requests per day" },
            { icon: "⚡", label: "Priority processing — faster responses" },
            { icon: "👁️", label: "GPT vision — scan receipts & price sheets" },
            { icon: "🧠", label: "Advanced job scoping & client intel" },
            { icon: "📝", label: "Longer note & ops summaries" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
              <span className="text-lg">{icon}</span>
              <span className="text-sm text-slate-700">{label}</span>
            </div>
          ))}
        </div>

        <AdvancedAiCheckoutButton />

        <p className="text-[11px] text-gray-400 text-center">
          Billed monthly. Cancel anytime from your billing portal.
        </p>
      </div>
    </div>
  );
}
