import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

export const metadata: Metadata = {
  title: "Pricing – TradeBase Contractor Software",
  description:
    "Founder pricing at $15/month locked in for life. Standard pricing $25/month after launch. No complicated tiers.",
};

const INCLUDED_FEATURES = [
  "Leads",
  "Customers",
  "Quotes",
  "Jobs",
  "Invoices",
  "Receipts & Expenses",
  "Inventory",
  "Trade Contacts",
  "Customer Portal",
  "AI Tools",
  "Daily Ops Board",
  "Reports & Export",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MarketingNav />

      <div className="bg-[#1B3A6B] text-white py-12 text-center">
        <div className="max-w-2xl mx-auto px-5">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Simple pricing for real contractors.</h1>
          <p className="text-blue-100 text-lg">No bloated tiers. No complicated setup. Just the tools you actually need.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          {/* Founder */}
          <div className="bg-[#1B3A6B] text-white rounded-2xl p-7 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-xl">
              FIRST 200 ONLY
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-blue-300 mb-2">Founder Plan</div>
            <div className="text-4xl font-bold mb-1">$15<span className="text-base font-normal text-blue-200">/month</span></div>
            <p className="text-blue-200 text-sm mb-6">Locked in for life — never increases.</p>
            <ul className="space-y-2 mb-8">
              {INCLUDED_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-blue-100">
                  <span className="text-green-400 font-bold">✓</span>
                  {f}
                </li>
              ))}
              <li className="flex items-start gap-2 text-sm text-blue-200 pt-1">
                <span className="text-yellow-300 font-bold">★</span>
                Founder badge on your account
              </li>
            </ul>
            <Link href="/waitlist"
              className="block w-full text-center rounded-xl py-3.5 bg-white font-bold text-[#1B3A6B] hover:bg-blue-50 transition-colors">
              Lock In Founder Pricing
            </Link>
          </div>

          {/* Standard */}
          <div className="bg-white rounded-2xl p-7 shadow-sm border border-gray-200">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Standard Plan</div>
            <div className="text-4xl font-bold text-slate-700 mb-1">$25<span className="text-base font-normal text-gray-400">/month</span></div>
            <p className="text-gray-400 text-sm mb-6">Regular pricing after launch.</p>
            <ul className="space-y-2 mb-8">
              {INCLUDED_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-green-500 font-bold">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/waitlist"
              className="block w-full text-center rounded-xl py-3.5 border-2 border-[#1B3A6B] font-bold text-[#1B3A6B] hover:bg-[#1B3A6B] hover:text-white transition-colors">
              Join Waitlist
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
          <h2 className="text-lg font-bold text-slate-800">Common Questions</h2>

          <div>
            <h3 className="font-semibold text-slate-700 text-sm mb-1">What does &ldquo;locked in for life&rdquo; mean?</h3>
            <p className="text-sm text-slate-500 leading-relaxed">If you join as a founding contractor, your rate stays at $15/month as long as your account is active — even after the standard price increases.</p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 text-sm mb-1">When does TradeBase launch?</h3>
            <p className="text-sm text-slate-500 leading-relaxed">We&apos;re in early access right now. Waitlist members will be the first to get in, and we&apos;ll send updates as launch gets closer.</p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 text-sm mb-1">Is there a free trial?</h3>
            <p className="text-sm text-slate-500 leading-relaxed">We haven&apos;t finalized trial details yet. Join the waitlist and you&apos;ll hear about early access options first.</p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 text-sm mb-1">Are there limits on AI usage?</h3>
            <p className="text-sm text-slate-500 leading-relaxed">AI features are included in both plans. We may apply fair use limits later if needed, but our intention is to keep them fully accessible.</p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 text-sm mb-1">Can I use TradeBase on my phone?</h3>
            <p className="text-sm text-slate-500 leading-relaxed">That&apos;s the whole point. TradeBase is a mobile-first progressive web app. Add it to your home screen and it works like a native app — no app store required.</p>
          </div>
        </div>
      </div>

      <div className="bg-[#1B3A6B] text-white py-12 text-center">
        <div className="max-w-xl mx-auto px-5">
          <h2 className="text-2xl font-bold mb-3">Spots are limited.</h2>
          <p className="text-blue-100 mb-6">Only the first 200 contractors lock in founder pricing. Join the waitlist before it&apos;s gone.</p>
          <Link href="/waitlist"
            className="inline-block rounded-xl px-8 py-3.5 bg-white font-bold text-[#1B3A6B] hover:bg-blue-50 transition-colors">
            Join the Waitlist
          </Link>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
