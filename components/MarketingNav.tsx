"use client";

import Link from "next/link";
import { useState } from "react";

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2 font-bold text-[#1B3A6B] text-lg">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none">
            <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke="#1B3A6B" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          TradeBase
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/features" className="hover:text-[#1B3A6B] transition-colors">Features</Link>
          <Link href="/pricing" className="hover:text-[#1B3A6B] transition-colors">Pricing</Link>
          <Link href="/auth/login" className="hover:text-[#1B3A6B] transition-colors">Log In</Link>
          <Link href="/waitlist"
            className="rounded-xl px-4 py-2 text-white font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1B3A6B" }}>
            Join Early Access
          </Link>
        </div>

        <button
          className="md:hidden p-2 rounded-lg text-slate-600"
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-5 py-4 space-y-3 text-sm font-medium text-slate-700">
          <Link href="/features" className="block py-1" onClick={() => setOpen(false)}>Features</Link>
          <Link href="/pricing" className="block py-1" onClick={() => setOpen(false)}>Pricing</Link>
          <Link href="/auth/login" className="block py-1" onClick={() => setOpen(false)}>Log In</Link>
          <Link href="/waitlist"
            className="block w-full rounded-xl px-4 py-2.5 text-white font-semibold text-center"
            style={{ backgroundColor: "#1B3A6B" }}
            onClick={() => setOpen(false)}>
            Join Early Access
          </Link>
        </div>
      )}
    </nav>
  );
}
