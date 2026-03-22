"use client";

import { useState } from "react";
import Link from "next/link";

const TRADES = [
  "General Contractor", "Electrician", "Plumber", "HVAC", "Roofer",
  "Painter", "Framer / Carpenter", "Concrete / Masonry", "Landscaper",
  "Flooring", "Drywall", "Insulation", "Tile", "Cabinet Maker",
  "Handyman", "Other",
];

type Step = 1 | 2 | 3 | "done";

export default function SignUpPage() {
  const [step, setStep] = useState<Step>(1);

  // Step 1 fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  // Step 2 fields
  const [bizName, setBizName] = useState("");
  const [trade, setTrade] = useState("");
  const [phone, setPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return;
    setStep(2);
  }

  function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setStep(3);
  }

  async function handleStep3(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Simulate a brief loading state — no real account creation
    await new Promise(r => setTimeout(r, 1200));
    setSubmitting(false);
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: "#1B3A6B" }}>
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "#E8F0FE" }}>
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="#1B3A6B" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">You&apos;re all set, {firstName}!</h1>
          <p className="text-sm text-gray-500 mb-6">
            Check your inbox at <span className="font-semibold text-slate-700">{email}</span> to confirm your account and get started.
          </p>
          <Link href="/auth/login"
            className="block w-full rounded-xl py-3 text-white font-semibold text-sm text-center"
            style={{ backgroundColor: "#1B3A6B" }}>
            Go to Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#1B3A6B" }}>
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none">
            <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="text-2xl font-bold text-white">TradeBase</span>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-sm mb-4">
          <div className="flex items-center gap-2 mb-1">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/20">
                <div className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: step >= n ? "100%" : "0%" }} />
              </div>
            ))}
          </div>
          <p className="text-xs text-white/60 text-right">Step {step} of 3</p>
        </div>

        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl">

          {/* ── Step 1: Account ── */}
          {step === 1 && (
            <>
              <h1 className="text-xl font-bold text-slate-800 mb-1">Create your account</h1>
              <p className="text-sm text-gray-400 mb-5">Free to start. No credit card required.</p>
              <form className="space-y-3" onSubmit={handleStep1}>
                <div className="grid grid-cols-2 gap-2">
                  <input required placeholder="First name *" value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  <input placeholder="Last name" value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                </div>
                <input required type="email" placeholder="Email address *" value={email}
                  autoComplete="email"
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                <input required type="password" placeholder="Password (min 8 chars) *" value={password}
                  autoComplete="new-password" minLength={8}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />

                <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-[#1B3A6B] cursor-pointer mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-600 leading-snug">
                    I agree to the{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer"
                      className="font-semibold underline" style={{ color: "#1B3A6B" }}
                      onClick={e => e.stopPropagation()}>Terms of Service</a>
                    {" "}and{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer"
                      className="font-semibold underline" style={{ color: "#1B3A6B" }}
                      onClick={e => e.stopPropagation()}>Privacy Policy</a>
                  </span>
                </label>

                <button type="submit" disabled={!agreed}
                  className="w-full rounded-xl py-3 font-semibold text-white text-sm mt-1 disabled:opacity-40 transition-opacity"
                  style={{ backgroundColor: "#1B3A6B" }}>
                  Continue →
                </button>

                <p className="text-xs text-center text-gray-400 pt-1">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="font-semibold underline" style={{ color: "#1B3A6B" }}>Log in</Link>
                </p>
              </form>
            </>
          )}

          {/* ── Step 2: Business Info ── */}
          {step === 2 && (
            <>
              <h1 className="text-xl font-bold text-slate-800 mb-1">Your business</h1>
              <p className="text-sm text-gray-400 mb-5">Help us set up your account for your trade.</p>
              <form className="space-y-3" onSubmit={handleStep2}>
                <input required placeholder="Business name *" value={bizName}
                  onChange={e => setBizName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                <select required value={trade} onChange={e => setTrade(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white">
                  <option value="">Select your trade *</option>
                  {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="tel" placeholder="Phone number (optional)" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />

                <button type="submit"
                  className="w-full rounded-xl py-3 font-semibold text-white text-sm mt-1"
                  style={{ backgroundColor: "#1B3A6B" }}>
                  Continue →
                </button>
                <button type="button" onClick={() => setStep(1)}
                  className="w-full text-sm text-gray-400 py-1">← Back</button>
              </form>
            </>
          )}

          {/* ── Step 3: Review & Confirm ── */}
          {step === 3 && (
            <>
              <h1 className="text-xl font-bold text-slate-800 mb-1">Looks good?</h1>
              <p className="text-sm text-gray-400 mb-5">Review your details and create your account.</p>

              <div className="space-y-2 mb-5">
                {[
                  { label: "Name", value: `${firstName} ${lastName}`.trim() },
                  { label: "Email", value: email },
                  { label: "Business", value: bizName },
                  { label: "Trade", value: trade },
                  ...(phone ? [{ label: "Phone", value: phone }] : []),
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-400">{row.label}</span>
                    <span className="font-medium text-slate-800 text-right max-w-[60%]">{row.value}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleStep3} className="space-y-3">
                <button type="submit" disabled={submitting}
                  className="w-full rounded-xl py-3 font-semibold text-white text-sm disabled:opacity-60"
                  style={{ backgroundColor: "#1B3A6B" }}>
                  {submitting ? "Creating your account…" : "Create Account"}
                </button>
                <button type="button" onClick={() => setStep(2)}
                  className="w-full text-sm text-gray-400 py-1">← Back</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
