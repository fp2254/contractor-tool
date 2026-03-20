import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  const password = process.env.DEMO_USER_PASSWORD;
  if (!password) {
    console.error("[demo] DEMO_USER_PASSWORD env var is not set");
    return NextResponse.redirect(`${origin}/auth/login?demo=not_configured`);
  }

  const response = NextResponse.redirect(`${origin}/app`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({
    email: "demo@trade-base.biz",
    password,
  });

  if (error) {
    console.error("[demo] sign-in failed:", error.message);
    return NextResponse.redirect(`${origin}/auth/login?demo=unavailable`);
  }

  return response;
}
