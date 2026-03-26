"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw new Error(err.message);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: "#1B3A6B" }}>
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#E8F0FE" }}>
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="#1B3A6B" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">You&apos;re all set!</h1>
          <p className="text-sm text-gray-500 mb-6">Your password has been saved. You can now log in to TradeBase.</p>
          <Link
            href="/auth/login"
            className="block w-full rounded-xl py-3 text-white font-semibold text-sm text-center"
            style={{ backgroundColor: "#1B3A6B" }}>
            Go to Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: "#1B3A6B" }}>
      <div className="flex items-center gap-2 mb-8">
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none">
          <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span className="text-2xl font-bold text-white">TradeBase</span>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl">
        <h1 className="text-xl font-bold text-slate-800 mb-1">Set your password</h1>
        <p className="text-sm text-gray-400 mb-5">Choose a password to secure your TradeBase account.</p>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            type="password"
            required
            minLength={8}
            placeholder="New password (min 8 chars)"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Confirm password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl py-3 font-semibold text-white text-sm disabled:opacity-60"
            style={{ backgroundColor: "#1B3A6B" }}>
            {submitting ? "Saving…" : "Set Password & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
