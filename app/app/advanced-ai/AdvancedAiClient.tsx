"use client";

import { useState } from "react";

export function AdvancedAiCheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addonType: "advanced_ai" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={startCheckout}
        disabled={loading}
        className="w-full py-3.5 rounded-2xl text-white text-base font-bold disabled:opacity-60 transition-opacity active:scale-95"
        style={{ backgroundColor: "#1B3A6B" }}
      >
        {loading ? "Loading checkout…" : "Subscribe — $19/mo"}
      </button>
      {error && (
        <p className="text-xs text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
