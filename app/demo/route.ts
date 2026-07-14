import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

const DEMO_EMAIL = "demo@trade-base.biz";
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD;

function getOrigin(req: Request): string {
  const fwdHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const fwdProto = req.headers.get("x-forwarded-proto") ?? "https";
  if (fwdHost) {
    const host = fwdHost.split(",")[0].trim();
    const proto = fwdProto.split(",")[0].trim();
    return `${proto}://${host}`;
  }
  return new URL(req.url).origin;
}

export async function GET(request: Request) {
  const origin = getOrigin(request);

  if (!DEMO_PASSWORD) {
    return NextResponse.redirect(`${origin}/auth/login?demo=unavailable`);
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
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  if (error) {
    console.error("[demo] sign-in failed:", error.message);
    return NextResponse.redirect(`${origin}/auth/login?demo=unavailable`);
  }

  return response;
}
