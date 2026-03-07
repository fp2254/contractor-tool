"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#1B3A6B" }}>
      <div className="flex flex-col items-center justify-center flex-1 px-6 pt-16 pb-8">
        <div className="flex items-center gap-2 mb-8">
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none">
            <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="text-3xl font-bold text-white">TradeBase</span>
        </div>

        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl">
          <h1 className="text-xl font-bold text-slate-800 mb-5">Log In</h1>
          <form className="space-y-3" action={formAction}>
            <input
              name="email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />

            <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
              <input
                type="checkbox"
                name="remember_me"
                defaultChecked
                className="w-4 h-4 rounded border-gray-300 accent-[#1B3A6B] cursor-pointer"
              />
              <span className="text-sm text-slate-600">Remember me</span>
            </label>

            {state?.error && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl py-3 font-semibold text-white text-sm mt-1 disabled:opacity-60"
              style={{ backgroundColor: "#1B3A6B" }}>
              {pending ? "Logging in…" : "Log In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
