"use client";

import { useRef, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const emailRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const email = emailRef.current?.value ?? "";
    if (!email) return;
    setPending(true);
    setError("");
    try {
      const res = await fetch("/auth/forgot-password/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
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
          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-800 mb-2">Check your email</h1>
              <p className="text-sm text-gray-500 mb-6">
                We sent a password reset link to <strong>{emailRef.current?.value}</strong>. Click the link in the email to set a new password.
              </p>
              <Link
                href="/auth/login"
                className="block w-full rounded-xl py-3 text-white font-semibold text-sm text-center"
                style={{ backgroundColor: "#1B3A6B" }}>
                Back to Log In
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-800 mb-1">Reset your password</h1>
              <p className="text-sm text-gray-400 mb-5">
                Enter the email on your account and we&apos;ll send you a reset link.
              </p>

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

                {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-xl py-3 font-semibold text-white text-sm disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: "#1B3A6B" }}>
                  {pending ? "Sending…" : "Send Reset Link"}
                </button>

                <p className="text-sm text-center text-gray-500 pt-1">
                  <Link href="/auth/login" className="font-semibold underline" style={{ color: "#1B3A6B" }}>
                    Back to Log In
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
