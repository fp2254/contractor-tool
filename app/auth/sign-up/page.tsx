"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const TRADES = [
  "General Contractor", "Electrician", "Plumber", "HVAC", "Roofer",
  "Painter", "Framer / Carpenter", "Concrete / Masonry", "Landscaper",
  "Flooring", "Drywall", "Insulation", "Tile", "Cabinet Maker",
  "Handyman", "Other",
];

type Step = 1 | 2 | 3 | "done";

function SignUpInner() {
  const searchParams = useSearchParams();
  const [refCode, setRefCode] = useState("");

  const [step, setStep] = useState<Step>(1);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Step 1 refs (uncontrolled)
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Step 2 refs (uncontrolled)
  const bizNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const tradeRef = useRef<HTMLSelectElement>(null);

  // Summary values (set when advancing steps)
  const [summary, setSummary] = useState({
    firstName: "", lastName: "", email: "", password: "",
    bizName: "", trade: "", phone: "",
  });

  useEffect(() => {
    const ref = searchParams.get("ref") ?? "";
    if (ref) setRefCode(ref.toUpperCase());
  }, [searchParams]);

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return;
    setSummary(s => ({
      ...s,
      firstName: firstNameRef.current?.value ?? "",
      lastName: lastNameRef.current?.value ?? "",
      email: emailRef.current?.value ?? "",
      password: passwordRef.current?.value ?? "",
    }));
    setStep(2);
  }

  function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setSummary(s => ({
      ...s,
      bizName: bizNameRef.current?.value ?? "",
      trade: tradeRef.current?.value ?? "",
      phone: phoneRef.current?.value ?? "",
    }));
    setStep(3);
  }

  async function handleStep3(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: summary.email,
          password: summary.password,
          first_name: summary.firstName,
          last_name: summary.lastName,
          biz_name: summary.bizName,
          trade: summary.trade,
          phone: summary.phone,
          ref_code: refCode || undefined,
        }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
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
          <h1 className="text-xl font-bold text-slate-800 mb-2">You&apos;re on the list, {summary.firstName}!</h1>
          <p className="text-sm text-gray-500 mb-6">
            We&apos;ll review your application and send an invite to{" "}
            <span className="font-semibold text-slate-700">{summary.email}</span> when your spot is ready.
          </p>
          <Link href="/"
            className="block w-full rounded-xl py-3 text-white font-semibold text-sm text-center"
            style={{ backgroundColor: "#1B3A6B" }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#1B3A6B" }}>
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12">

        <div className="flex items-center gap-2 mb-8">
          <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none">
            <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="text-2xl font-bold text-white">TradeBase</span>
        </div>

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

          {step === 1 && (
            <>
              <h1 className="text-xl font-bold text-slate-800 mb-1">Create your account</h1>
              <p className="text-sm text-gray-400 mb-5">Free to start. No credit card required.</p>
              <form className="space-y-3" onSubmit={handleStep1}>
                <div className="grid grid-cols-2 gap-2">
                  <input ref={firstNameRef} required name="first_name" placeholder="First name *"
                    className="rounded-xl border border-gray-200 px-3 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  <input ref={lastNameRef} name="last_name" placeholder="Last name"
                    className="rounded-xl border border-gray-200 px-3 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                </div>
                <input ref={emailRef} required type="email" name="email" placeholder="Email address *"
                  autoComplete="email"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                <input ref={passwordRef} required type="password" name="password" placeholder="Password (min 8 chars) *"
                  autoComplete="new-password" minLength={8}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />

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

          {step === 2 && (
            <>
              <h1 className="text-xl font-bold text-slate-800 mb-1">Your business</h1>
              <p className="text-sm text-gray-400 mb-5">Help us set up your account for your trade.</p>
              <form className="space-y-3" onSubmit={handleStep2}>
                <input ref={bizNameRef} required name="biz_name" placeholder="Business name *"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                <select ref={tradeRef} required name="trade"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white">
                  <option value="">Select your trade *</option>
                  {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input ref={phoneRef} type="tel" name="phone" placeholder="Phone number (optional)"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
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

          {step === 3 && (
            <>
              <h1 className="text-xl font-bold text-slate-800 mb-1">Looks good?</h1>
              <p className="text-sm text-gray-400 mb-5">Review your details before creating your account.</p>
              <div className="space-y-2 mb-5">
                {[
                  { label: "Name", value: `${summary.firstName} ${summary.lastName}`.trim() },
                  { label: "Email", value: summary.email },
                  { label: "Business", value: summary.bizName },
                  { label: "Trade", value: summary.trade },
                  ...(summary.phone ? [{ label: "Phone", value: summary.phone }] : []),
                  ...(refCode ? [{ label: "Referred by", value: refCode }] : []),
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-400">{row.label}</span>
                    <span className="font-medium text-slate-800 text-right max-w-[60%] break-all">{row.value}</span>
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-sm text-red-600 mb-3">{error}</p>
              )}

              <form onSubmit={handleStep3} className="space-y-3">
                <button
                  type="submit"
                  disabled
                  className="w-full rounded-xl py-3 font-semibold text-white text-sm opacity-40 cursor-not-allowed"
                  style={{ backgroundColor: "#1B3A6B" }}>
                  {submitting ? "Creating your account…" : "Create Account"}
                </button>
                <p className="text-xs text-center text-gray-400">
                  Early access only — you&apos;ll receive an invite when your spot opens.
                </p>
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

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpInner />
    </Suspense>
  );
}
