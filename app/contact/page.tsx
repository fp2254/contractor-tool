import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

export const metadata: Metadata = {
  title: "Contact TradeBase | Get in Touch",
  description: "Questions about TradeBase? Reach out — we're a small team and we actually read every message.",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MarketingNav />

      <section className="bg-[#1B3A6B] text-white py-14 md:py-20">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Get in Touch</h1>
          <p className="text-blue-100 text-lg">We&apos;re a small team. We read every message and respond fast.</p>
        </div>
      </section>

      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-2xl mx-auto px-5">
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 mb-8">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Email Us</h2>
            <p className="text-slate-500 mb-4">For general questions, feedback, or support.</p>
            <a href="mailto:hello@trade-base.biz"
              className="text-[#1B3A6B] font-semibold text-lg hover:underline">
              hello@trade-base.biz
            </a>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 mb-8">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Try Before You Contact</h2>
            <p className="text-slate-500 mb-4">A lot of questions are best answered by seeing the app yourself. Try the live demo — no signup required.</p>
            <Link href="/demo"
              className="inline-block rounded-xl px-6 py-3 bg-[#1B3A6B] text-white font-bold hover:bg-blue-900 transition-colors">
              Open Free Demo
            </Link>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Pricing Questions</h2>
            <p className="text-slate-500 mb-4">Want to know about plans, founding member pricing, or billing?</p>
            <Link href="/pricing"
              className="inline-block rounded-xl px-6 py-3 bg-gray-100 text-slate-700 font-semibold hover:bg-gray-200 transition-colors">
              See Pricing Page
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
