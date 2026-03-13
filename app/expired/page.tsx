"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ExpiredPage() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "#1B3A6B" }}>
      <div className="flex items-center gap-2 mb-8">
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none">
          <path
            d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-2xl font-bold text-white">TradeBase</span>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl p-7 shadow-xl text-center space-y-4">
        <div className="text-5xl mb-1">🔒</div>
        <h1 className="text-xl font-bold text-slate-800">Subscription Expired</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Your TradeBase subscription has expired. Renew your subscription to
          continue using your account.
        </p>

        <div className="space-y-2.5 pt-2">
          <a
            href="mailto:support@tradebase.app?subject=Renew+TradeBase+Subscription"
            className="block w-full rounded-xl py-3 font-semibold text-white text-sm"
            style={{ backgroundColor: "#1B3A6B" }}>
            Renew Now
          </a>
          <a
            href="mailto:support@tradebase.app"
            className="block w-full rounded-xl py-3 font-semibold text-slate-700 text-sm border border-gray-200">
            Contact Support
          </a>
          <button
            onClick={handleLogout}
            className="block w-full rounded-xl py-3 font-semibold text-red-500 text-sm">
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
