"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RealtorSignUpPage() {
  const [fullName, setFullName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/auth/realtor-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          agency_name: agencyName,
          phone,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError("Account created — please log in.");
        window.location.href = "/auth/login";
        return;
      }
      window.location.href = "/realtor";
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#1B3A6B" }}>
      <div className="flex flex-col items-center justify-center flex-1 px-6 pt-12 pb-8">
        <div className="flex items-center gap-2 mb-6">
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none">
            <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="text-3xl font-bold text-white">TradeBase</span>
        </div>

        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl">
          <h1 className="text-xl font-bold text-slate-800 mb-1">Realtor Sign Up</h1>
          <p className="text-sm text-gray-500 mb-5">
            Connect with contractors and send work requests for your clients.
          </p>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Full name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <input
              type="text"
              placeholder="Agency / brokerage (optional)"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <input
              type="email"
              placeholder="Email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <input
              type="password"
              placeholder="Password (min 8 characters)"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />

            {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl py-3 font-semibold text-white text-sm mt-1 disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: "#1B3A6B" }}
            >
              {pending ? "Creating account…" : "Create Realtor Account"}
            </button>

            <p className="text-sm text-center text-gray-500 pt-1">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-semibold underline" style={{ color: "#1B3A6B" }}>
                Log in
              </Link>
            </p>

            <p className="text-xs text-center text-gray-400 pt-1">
              Are you a contractor?{" "}
              <Link href="/auth/sign-up" className="underline" style={{ color: "#1B3A6B" }}>
                Sign up here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
