"use client";

import Link from "next/link";

export default function QuoteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-3xl">⚠️</div>
      <h2 className="text-lg font-bold text-slate-800">Couldn&apos;t load this quote</h2>
      <p className="text-sm text-gray-500 text-center max-w-xs">
        Something went wrong while loading the quote. The quote was saved — try refreshing or go back to your list.
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: "#1B3A6B" }}>
          Try Again
        </button>
        <Link
          href="/app/quotes"
          className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-gray-200 text-slate-600">
          Back to Quotes
        </Link>
      </div>
    </div>
  );
}
