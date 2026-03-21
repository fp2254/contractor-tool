import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

export type SeoPageProps = {
  h1: string;
  subtitle: string;
  problemHeadline: string;
  problems: string[];
  solutionHeadline: string;
  solutionText: string;
  features: { icon: string; name: string; desc: string }[];
  ctaText?: string;
  trade?: string;
  mistakes?: string[];
  internalLinks?: { href: string; label: string }[];
};

export function SeoLandingPage({
  h1,
  subtitle,
  problemHeadline,
  problems,
  solutionHeadline,
  solutionText,
  features,
  ctaText = "Try TradeBase Free",
  mistakes,
  internalLinks,
}: SeoPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <MarketingNav />

      {/* Hero */}
      <section className="bg-[#1B3A6B] text-white py-14 md:py-20">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{h1}</h1>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">{subtitle}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/demo"
              className="w-full sm:w-auto rounded-xl px-8 py-3.5 bg-white font-bold text-[#1B3A6B] hover:bg-blue-50 transition-colors">
              {ctaText}
            </Link>
            <Link href="/pricing"
              className="w-full sm:w-auto rounded-xl px-8 py-3.5 border border-blue-400 text-white font-semibold hover:bg-blue-800 transition-colors">
              See Pricing
            </Link>
          </div>
          <p className="text-blue-300 text-sm mt-4">No signup required for demo. Built for contractors.</p>
        </div>
      </section>

      {/* Problem */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-5">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 text-center mb-8">{problemHeadline}</h2>
          <ul className="space-y-3 max-w-md mx-auto mb-8">
            {problems.map((p) => (
              <li key={p} className="flex items-start gap-3 text-slate-600 text-base">
                <span className="text-red-400 font-bold text-lg flex-shrink-0 mt-0.5">✕</span>
                {p}
              </li>
            ))}
          </ul>
          <p className="text-center text-lg font-semibold text-[#1B3A6B]">TradeBase puts it all in one place.</p>
        </div>
      </section>

      {/* Solution */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-5">{solutionHeadline}</h2>
          <p className="text-slate-500 text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-8">{solutionText}</p>
          <Link href="/demo"
            className="inline-block rounded-xl px-8 py-3.5 bg-[#1B3A6B] font-bold text-white hover:bg-blue-900 transition-colors">
            See It in Action — Free Demo
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">What you get with TradeBase</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.name} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="text-2xl mb-2">{f.icon}</div>
                <h3 className="font-bold text-slate-800 mb-1">{f.name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Common Mistakes */}
      {mistakes && mistakes.length > 0 && (
        <section className="py-12 md:py-16 bg-amber-50 border-y border-amber-100">
          <div className="max-w-3xl mx-auto px-5">
            <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">Common Mistakes Contractors Make</h2>
            <ul className="space-y-4">
              {mistakes.map((m) => (
                <li key={m} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
                  <span className="text-amber-500 font-bold text-lg flex-shrink-0 mt-0.5">⚠</span>
                  <span className="text-slate-600 text-base">{m}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Why TradeBase CTA */}
      <section className="py-12 md:py-16 bg-[#1B3A6B] text-white">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <h2 className="text-2xl font-bold mb-3">Why Contractors Choose TradeBase</h2>
          <p className="text-blue-100 mb-2">Built for the phone. Built for the field. Not a spreadsheet in disguise.</p>
          <ul className="text-blue-200 text-sm space-y-1 mb-6 text-left max-w-xs mx-auto">
            <li>✓ Send quotes and invoices in under 2 minutes</li>
            <li>✓ Track every job, lead, and customer in one place</li>
            <li>✓ No complicated setup — get started today</li>
            <li>✓ Works entirely from your phone</li>
          </ul>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/demo"
              className="w-full sm:w-auto rounded-xl px-8 py-3.5 bg-white font-bold text-[#1B3A6B] hover:bg-blue-50 transition-colors">
              Try Free Demo
            </Link>
            <Link href="/pricing"
              className="w-full sm:w-auto rounded-xl px-8 py-3.5 border border-blue-400 text-white font-semibold hover:bg-blue-800 transition-colors">
              See Plans
            </Link>
          </div>
          <p className="text-blue-300 text-sm mt-3">No credit card. No complicated setup.</p>
        </div>
      </section>

      {/* Internal Links */}
      {internalLinks && internalLinks.length > 0 && (
        <section className="py-10 bg-gray-50 border-t border-gray-200">
          <div className="max-w-3xl mx-auto px-5">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Related Resources</h3>
            <div className="flex flex-wrap gap-3">
              {internalLinks.map((link) => (
                <Link key={link.href} href={link.href}
                  className="rounded-lg px-4 py-2 bg-white border border-gray-200 text-sm text-slate-600 hover:border-blue-300 hover:text-[#1B3A6B] transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <MarketingFooter />
    </div>
  );
}
