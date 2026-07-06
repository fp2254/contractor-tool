"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        window.location.href = user.user_metadata?.account_type === "realtor" ? "/realtor" : "/app";
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = emailRef.current?.value ?? "";
    const password = passwordRef.current?.value ?? "";
    if (!email || !password) return;
    setPending(true);
    setError("");
    try {
      const res = await fetch("/auth/login/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Incorrect email or password.");
        return;
      }
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      window.location.href = user?.user_metadata?.account_type === "realtor" ? "/realtor" : "/app";
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

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

          <form className="space-y-3" onSubmit={handleSubmit}>
            <input
              ref={emailRef}
              type="email"
              name="email"
              placeholder="Email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <input
              ref={passwordRef}
              type="password"
              name="password"
              placeholder="Password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />

            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-xs font-semibold" style={{ color: "#1B3A6B" }}>
                Forgot password?
              </Link>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
              <input
                type="checkbox"
                name="remember_me"
                defaultChecked
                className="w-4 h-4 rounded border-gray-300 accent-[#1B3A6B] cursor-pointer"
              />
              <span className="text-sm text-slate-600">Remember me</span>
            </label>

            {error && (
              <p className="text-sm text-red-600 font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl py-3 font-semibold text-white text-sm mt-1 disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: "#1B3A6B" }}>
              {pending ? "Logging in…" : "Log In"}
            </button>

            <p className="text-sm text-center text-gray-500 pt-1">
              New here?{" "}
              <Link href="/auth/sign-up" className="font-semibold underline" style={{ color: "#1B3A6B" }}>
                Create an account
              </Link>
            </p>

            <p className="text-xs text-center text-gray-400">
              Are you a realtor?{" "}
              <Link href="/auth/realtor-signup" className="underline" style={{ color: "#1B3A6B" }}>
                Sign up here
              </Link>
            </p>

            <p className="text-xs text-center text-gray-400">
              By logging in you agree to our{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer"
                className="underline" style={{ color: "#1B3A6B" }}>Terms</a>
              {" "}and{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer"
                className="underline" style={{ color: "#1B3A6B" }}>Privacy Policy</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
