import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

const DEMO_EMAIL = "demo@trade-base.biz";
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "TradeBaseDemo2024!";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

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
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  if (error) {
    console.error("[demo] sign-in failed:", error.message);
    return NextResponse.redirect(`${origin}/auth/login?demo=unavailable`);
  }

  return response;
}
