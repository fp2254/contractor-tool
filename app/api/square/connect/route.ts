import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";

const SQUARE_OAUTH_STATE_COOKIE = "square_oauth_state";
const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

export async function GET() {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.redirect("/auth/login");

  const clientId = process.env.SQUARE_APP_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Square not configured" }, { status: 500 });
  }

  const scope = [
    "MERCHANT_PROFILE_READ",
    "PAYMENTS_READ",
    "PAYMENTS_WRITE",
    "ORDERS_READ",
    "ORDERS_WRITE",
    "INVOICES_READ",
    "INVOICES_WRITE",
    "CUSTOMERS_READ",
    "CUSTOMERS_WRITE",
  ].join(" ");

  const baseUrl = process.env.SQUARE_SANDBOX === "true"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/square/callback`;
  const state = crypto.randomUUID();
  const authorizeUrl = new URL("/oauth2/authorize", baseUrl);
  authorizeUrl.search = new URLSearchParams({
    client_id: clientId,
    scope,
    session: "false",
    state,
    redirect_uri: redirectUri,
  }).toString();

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(SQUARE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  });

  return response;
}
