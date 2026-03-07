"use client";

import { FormEvent, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Suspense } from "react";

function SignUpForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const refCode = useRef<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) refCode.current = ref.toUpperCase();
  }, [searchParams]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
      return;
    }

    if (refCode.current) {
      try {
        await fetch("/auth/sign-up/referral-api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: refCode.current,
            referred_email: email,
            referred_user_id: data.user?.id ?? null,
          }),
        });
      } catch {
        // non-fatal — referral recording failure shouldn't block signup
      }
    }

    setMessage("Account created. If email confirmation is off, you can log in now.");
    router.push("/auth/login");
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-3xl font-bold">Sign Up</h1>
      {refCode.current && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
          <p className="text-sm text-green-700 font-medium">
            You were referred by a TradeBase contractor. Welcome!
          </p>
        </div>
      )}
      <form className="space-y-3" onSubmit={onSubmit}>
        <Input name="email" type="email" placeholder="Email" required />
        <Input name="password" type="password" placeholder="Password" required minLength={6} />
        {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        <Button type="submit" className="w-full">Create Account</Button>
      </form>
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
