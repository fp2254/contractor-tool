"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SignUpPage() {
  const supabase = createClient();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Account created. If email confirmation is off, you can log in now.");
    router.push("/auth/login");
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-3xl font-bold">Sign Up</h1>
      <form className="space-y-3" onSubmit={onSubmit}>
        <Input name="email" type="email" placeholder="Email" required />
        <Input name="password" type="password" placeholder="Password" required minLength={6} />
        {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        <Button type="submit" className="w-full">Create Account</Button>
      </form>
    </main>
  );
}
