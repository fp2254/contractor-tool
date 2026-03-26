import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "invite" | "recovery" | "email" | "signup" | null;
  const next = searchParams.get("next") ?? "/auth/set-password";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as Parameters<typeof supabase.auth.verifyOtp>[0]["type"],
      token_hash,
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/auth/login?error=invalid-link", origin));
}
