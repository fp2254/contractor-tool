import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TYPE_DESTINATIONS: Record<string, string> = {
  recovery: "/auth/set-password",
  invite: "/auth/set-password",
  email: "/app",
  signup: "/app",
  magiclink: "/app",
  email_change: "/app/settings",
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  if (!token_hash || !type) {
    console.error("[auth/confirm] Missing token_hash or type");
    return NextResponse.redirect(
      new URL("/auth/error?reason=missing-params", origin)
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    type: type as Parameters<typeof supabase.auth.verifyOtp>[0]["type"],
    token_hash,
  });

  if (error) {
    console.error("[auth/confirm] verifyOtp error:", error.message, "type:", type);
    return NextResponse.redirect(
      new URL(`/auth/error?reason=invalid-link`, origin)
    );
  }

  const destination = next ?? TYPE_DESTINATIONS[type] ?? "/app";
  return NextResponse.redirect(new URL(destination, origin));
}
