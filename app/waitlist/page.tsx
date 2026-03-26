import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { createAdminClient } from "@/lib/supabase/admin";
import WaitlistForm from "./WaitlistForm";

export const metadata: Metadata = {
  title: "Join the Waitlist – TradeBase Contractor Software",
  description:
    "Be one of the first contractors to get access to TradeBase. Lock in founder pricing at $15/month for life.",
};

const CAP = 200;

export default async function WaitlistPage() {
  const admin = createAdminClient();
  const { count } = await (admin as any)
    .from("waitlist")
    .select("id", { count: "exact", head: true });

  const spotsUsed = Math.min(count ?? 0, CAP);
  const spotsLeft = Math.max(CAP - spotsUsed, 0);
  const isFull = spotsLeft === 0;
  const pct = Math.round((spotsUsed / CAP) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      <MarketingNav />

      <div className="bg-[#1B3A6B] text-white py-12 text-center">
        <div className="max-w-xl mx-auto px-5">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Join the TradeBase Waitlist</h1>
          <p className="text-blue-100 text-lg">
            Be one of the first contractors to get access when TradeBase launches.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-10">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          {/* Founder spots counter */}
          <div className="mb-6 pb-5 border-b border-gray-100">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-yellow-100 rounded-xl p-3 flex-shrink-0">
                <span className="text-xl">⭐</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm">Lock in $15/month for life</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  The first 200 contractors who join get founder pricing — locked in permanently when we launch.
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className={isFull ? "text-red-600" : "text-[#1B3A6B]"}>
                  {isFull ? "All spots claimed" : `${spotsLeft} of ${CAP} founder spots left`}
                </span>
                <span className="text-gray-400">{spotsUsed}/{CAP}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isFull ? "bg-red-500" : "bg-[#1B3A6B]"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>

          <Suspense fallback={<div className="py-8 text-center text-gray-400 text-sm">Loading…</div>}>
            <WaitlistForm isFull={isFull} />
          </Suspense>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="text-lg mb-1">🔒</div>
            No credit card
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="text-lg mb-1">📱</div>
            Mobile-first app
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="text-lg mb-1">🔨</div>
            Built for trades
          </div>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
