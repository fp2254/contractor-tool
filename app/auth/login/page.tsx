"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-3xl font-bold">Log In</h1>
      <form className="space-y-3" action={formAction}>
        <Input name="email" type="email" placeholder="Email" autoComplete="email" required />
        <Input name="password" type="password" placeholder="Password" autoComplete="current-password" required />
        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Logging in…" : "Log In"}
        </Button>
      </form>
    </main>
  );
}
