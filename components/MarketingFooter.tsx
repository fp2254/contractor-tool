import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="bg-[#1B3A6B] text-white mt-16">
      <div className="max-w-6xl mx-auto px-5 py-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 font-bold text-lg mb-2">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              TradeBase
            </div>
            <p className="text-blue-200 text-sm max-w-xs leading-relaxed">
              Contractor business software built for the field, not the office.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-blue-100">
            <Link href="/features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/waitlist" className="hover:text-white transition-colors">Join Waitlist</Link>
            <Link href="/auth/login" className="hover:text-white transition-colors">Log In</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>

        <div className="border-t border-blue-700 mt-8 pt-6 text-xs text-blue-300">
          © {new Date().getFullYear()} TradeBase Contractors — a DBA of Liberty Grove Homestead Company, LLC. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
