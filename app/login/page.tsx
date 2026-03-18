import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

export const metadata: Metadata = {
  title: "Log In – TradeBase",
  description: "Log in to your TradeBase contractor account.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MarketingNav />
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-16">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
              <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke="#1B3A6B" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="text-2xl font-bold text-[#1B3A6B]">TradeBase</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Log in to TradeBase</h1>
          <p className="text-sm text-slate-500 mb-6">Access your quotes, jobs, invoices, and more.</p>
          <Link href="/auth/login"
            className="block w-full rounded-xl py-3.5 text-white font-bold text-base shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#1B3A6B" }}>
            Go to App
          </Link>
          <p className="text-xs text-gray-400 mt-4">
            Not on TradeBase yet?{" "}
            <Link href="/waitlist" className="text-[#1B3A6B] font-semibold underline">Join the waitlist</Link>
          </p>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
