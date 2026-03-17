"use client";

import { Suspense } from "react";
import Link from "next/link";

function SignUpForm() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-3xl font-bold">Sign Up</h1>
      <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-4 mb-4">
        <p className="text-sm text-yellow-800 font-medium">Sign-ups are currently closed.</p>
        <p className="text-sm text-yellow-700 mt-1">We&apos;re onboarding users manually right now. Reach out to get access.</p>
      </div>
      <p className="text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-[#1B3A6B] font-semibold underline">Log in</Link>
      </p>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <SignUpForm />
    </Suspense>
  );
}
