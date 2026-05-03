import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";

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
  ].join("+");

  const baseUrl = process.env.SQUARE_SANDBOX === "true"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/square/callback`;

  const url = `${baseUrl}/oauth2/authorize?client_id=${clientId}&scope=${scope}&session=false&state=${orgId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return NextResponse.redirect(url);
}
