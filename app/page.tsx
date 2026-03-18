import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

export const metadata: Metadata = {
  title: "TradeBase – Contractor Business Software Built for the Jobsite",
  description:
    "TradeBase helps contractors manage quotes, jobs, invoices, receipts, inventory, and customer communication from one mobile-first app.",
  openGraph: {
    title: "TradeBase – Contractor Business Software Built for the Jobsite",
    description:
      "TradeBase helps contractors manage quotes, jobs, invoices, receipts, inventory, and customer communication from one mobile-first app.",
    url: "https://trade-base.biz",
    siteName: "TradeBase",
    type: "website",
  },
};

const FEATURES = [
  { icon: "📥", name: "Leads", desc: "Capture every incoming call, referral, and inquiry. Nothing falls through the cracks." },
  { icon: "👤", name: "Customers", desc: "All your client info, job history, and notes in one place. No more digging through texts." },
  { icon: "📋", name: "Quotes", desc: "Build professional quotes in minutes on your phone. Send a link — no PDF hassle." },
  { icon: "🔨", name: "Jobs", desc: "Schedule jobs, track status, attach photos, and keep your crew on the same page." },
  { icon: "💵", name: "Invoices", desc: "Send invoices the moment the job is done. Mark payments, track what's overdue." },
  { icon: "🧾", name: "Receipts", desc: "Scan and log receipts from the job site. No more stuffing paper into your glove box." },
  { icon: "📦", name: "Inventory", desc: "Track your parts, materials, and tools. Know what you have before you order more." },
  { icon: "🤝", name: "Trade Contacts", desc: "Your network of electricians, plumbers, and subs — organized and ready to refer." },
  { icon: "🤖", name: "AI Tools", desc: "Capture jobs by voice, generate scope of work, draft follow-ups, and more." },
];

const AI_FEATURES = [
  { name: "AI Job Capture", desc: "Describe a job in plain English and TradeBase fills in the details — customer, scope, line items, all of it." },
  { name: "Scope of Work Generator", desc: "Add your line items and let AI write a professional scope of work you can put on any quote." },
  { name: "Receipt Scanner", desc: "Point your camera at any receipt. TradeBase reads it and logs the expense." },
  { name: "Business Card Scanner", desc: "Scan a sub's card on the jobsite and add them to your Trade Contacts instantly." },
  { name: "Permit Assistant", desc: "Ask questions about local permits, inspections, and code requirements in plain language." },
  { name: "Client Intel", desc: "Get a quick AI summary of a customer's history, open jobs, and outstanding balances before you call." },
  { name: "Follow-up Drafter", desc: "Sent a quote and heard nothing back? AI writes a professional follow-up message for you." },
  { name: "Daily Ops Summary", desc: "Open the app each morning and see exactly what needs attention today — jobs, quotes, overdue invoices." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MarketingNav />

      {/* HERO */}
      <section className="bg-[#1B3A6B] text-white">
        <div className="max-w-4xl mx-auto px-5 py-16 md:py-24 text-center">
          <div className="inline-block bg-blue-800 text-blue-200 text-xs font-semibold rounded-full px-3 py-1 mb-6 tracking-wide uppercase">
            Early Access — First 200 Contractors
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
            Stop doing paperwork<br className="hidden sm:block" /> at night.
          </h1>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            TradeBase helps contractors run quotes, jobs, invoices, receipts, inventory, and customer communication from one mobile-first app.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/waitlist"
              className="w-full sm:w-auto rounded-xl px-8 py-3.5 bg-white font-bold text-[#1B3A6B] text-base shadow-lg hover:bg-blue-50 transition-colors">
              Join Early Access
            </Link>
            <Link href="/features"
              className="w-full sm:w-auto rounded-xl px-8 py-3.5 border border-blue-400 text-white font-semibold text-base hover:bg-blue-800 transition-colors">
              See All Features
            </Link>
          </div>
          <p className="text-blue-300 text-sm mt-5">Built for contractors. Designed for the field.</p>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-8">
            Most contractors are still running their business the hard way.
          </h2>
          <ul className="space-y-3 text-left max-w-md mx-auto mb-8">
            {[
              "Quotes written after hours",
              "Invoices scattered everywhere",
              "Receipts lost in the truck",
              "Customer info split across apps",
              "Jobs tracked through texts and notes",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-slate-600 text-base">
                <span className="text-red-400 text-lg flex-shrink-0">✕</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-lg font-semibold text-[#1B3A6B]">TradeBase puts it all in one place.</p>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-14 md:py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-5">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 text-center mb-3">
            Run your business from your phone.
          </h2>
          <p className="text-center text-slate-500 mb-10">Everything a contractor needs — nothing they don&apos;t.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.name} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-slate-800 mb-1">{f.name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/features"
              className="inline-block rounded-xl px-6 py-3 border-2 border-[#1B3A6B] text-[#1B3A6B] font-semibold text-sm hover:bg-[#1B3A6B] hover:text-white transition-colors">
              View Full Feature List
            </Link>
          </div>
        </div>
      </section>

      {/* AI SECTION */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-10">
            <div className="inline-block bg-purple-100 text-purple-700 text-xs font-bold rounded-full px-3 py-1 mb-4 uppercase tracking-wide">
              AI Features
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
              Built with AI from the ground up.
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Not gimmicks. Practical tools that save time on the jobs you do every day.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {AI_FEATURES.map((f) => (
              <div key={f.name} className="flex items-start gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: "#7C3AED" }} />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm mb-1">{f.name}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MOBILE FIRST */}
      <section className="py-14 md:py-20 bg-[#1B3A6B] text-white">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-5">
            Built for the jobsite, not the office.
          </h2>
          <p className="text-blue-100 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
            TradeBase is designed for a phone first. Fast taps, simple screens, and everything you need while standing in a driveway, basement, truck, or jobsite. No training required. No complicated setup.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {["Works offline", "One-tap actions", "Built for mobile"].map((t) => (
              <div key={t} className="bg-blue-800 rounded-xl px-3 py-3 text-xs font-semibold text-blue-100 text-center">
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CUSTOMER PORTAL */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <div className="text-3xl mb-4">📤</div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-5">
            Send quotes and invoices like a pro.
          </h2>
          <p className="text-slate-500 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
            Customers can open a branded portal, review documents, sign quotes, download PDFs, and approve work — without needing an account. You look sharp. They stay informed.
          </p>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="py-14 md:py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
            Founding Contractor Pricing
          </h2>
          <p className="text-slate-500 mb-10">The first 200 contractors will lock in founder pricing when TradeBase launches.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-xl mx-auto">
            <div className="bg-[#1B3A6B] text-white rounded-2xl p-6 shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full px-3 py-1">
                FOUNDER PRICING
              </div>
              <div className="text-3xl font-bold mt-2">$15<span className="text-base font-normal text-blue-200">/mo</span></div>
              <p className="text-blue-100 text-sm mt-1 mb-4">Locked in for life</p>
              <p className="text-xs text-blue-200">First 200 contractors only</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Standard</div>
              <div className="text-3xl font-bold text-slate-700">$25<span className="text-base font-normal text-gray-400">/mo</span></div>
              <p className="text-gray-400 text-sm mt-1 mb-4">After launch</p>
              <p className="text-xs text-gray-400">Regular pricing</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-6">No bloated tiers. No complicated setup. Just the tools contractors actually need.</p>
          <div className="mt-6">
            <Link href="/pricing" className="text-[#1B3A6B] text-sm font-semibold underline">
              View full pricing details →
            </Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-14 md:py-20 bg-[#1B3A6B] text-white">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Be one of the first contractors on TradeBase.
          </h2>
          <p className="text-blue-100 mb-8">Get early access, founder pricing, and launch updates.</p>
          <Link href="/waitlist"
            className="inline-block rounded-xl px-10 py-4 bg-white font-bold text-[#1B3A6B] text-base shadow-lg hover:bg-blue-50 transition-colors">
            Join the Waitlist
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
