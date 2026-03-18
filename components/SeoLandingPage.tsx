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
};

export function SeoLandingPage({
  h1,
  subtitle,
  problemHeadline,
  problems,
  solutionHeadline,
  solutionText,
  features,
  ctaText = "Join Early Access",
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
            <Link href="/waitlist"
              className="w-full sm:w-auto rounded-xl px-8 py-3.5 bg-white font-bold text-[#1B3A6B] hover:bg-blue-50 transition-colors">
              {ctaText}
            </Link>
            <Link href="/features"
              className="w-full sm:w-auto rounded-xl px-8 py-3.5 border border-blue-400 text-white font-semibold hover:bg-blue-800 transition-colors">
              See All Features
            </Link>
          </div>
          <p className="text-blue-300 text-sm mt-4">Built for contractors. Designed for the field.</p>
        </div>
      </section>

      {/* Problem */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-5">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 text-center mb-8">{problemHeadline}</h2>
          <ul className="space-y-3 max-w-md mx-auto mb-8">
            {problems.map((p) => (
              <li key={p} className="flex items-center gap-3 text-slate-600 text-base">
                <span className="text-red-400 font-bold text-lg flex-shrink-0">✕</span>
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
          <p className="text-slate-500 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">{solutionText}</p>
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

      {/* Pricing teaser */}
      <section className="py-12 md:py-16 bg-[#1B3A6B] text-white">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <h2 className="text-2xl font-bold mb-3">Founding Contractor Pricing</h2>
          <p className="text-blue-100 mb-6">The first 200 contractors lock in $15/month for life. Standard pricing is $25/month after launch.</p>
          <Link href="/waitlist"
            className="inline-block rounded-xl px-8 py-3.5 bg-white font-bold text-[#1B3A6B] hover:bg-blue-50 transition-colors">
            {ctaText}
          </Link>
          <p className="text-blue-300 text-sm mt-3">No credit card. No complicated setup.</p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
