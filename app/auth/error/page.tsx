"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const REASONS: Record<string, { title: string; body: string }> = {
  "missing-params": {
    title: "Invalid Link",
    body: "This link is incomplete or has been corrupted. Please request a new one.",
  },
  "invalid-link": {
    title: "Link Expired or Already Used",
    body: "This link has already been used or has expired. Password reset links are valid for 1 hour.",
  },
};

function ErrorContent() {
  const params = useSearchParams();
  const reason = params.get("reason") ?? "invalid-link";
  const { title, body } = REASONS[reason] ?? REASONS["invalid-link"];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: "#1B3A6B" }}>
      <div className="flex items-center gap-2 mb-8">
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none">
          <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span className="text-2xl font-bold text-white">TradeBase</span>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-50">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-slate-800 mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-6">{body}</p>

        <Link
          href="/auth/forgot-password"
          className="block w-full rounded-xl py-3 text-white font-semibold text-sm text-center mb-3"
          style={{ backgroundColor: "#1B3A6B" }}>
          Request a New Link
        </Link>
        <Link
          href="/auth/login"
          className="block w-full rounded-xl py-3 text-slate-600 font-semibold text-sm text-center border border-gray-200">
          Back to Log In
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <ErrorContent />
    </Suspense>
  );
}
