"use client";

import { useState } from "react";

export function SquarePaymentButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/square/payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Failed to create payment link");
        return;
      }
      window.open(data.url, "_blank", "noopener");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-white font-semibold disabled:opacity-60"
        style={{ backgroundColor: "#000000" }}>
        {loading ? (
          <span className="animate-pulse">Creating link…</span>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white flex-shrink-0">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <rect x="8" y="8" width="8" height="8" rx="1" fill="black" />
            </svg>
            Send Square Payment Link
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
