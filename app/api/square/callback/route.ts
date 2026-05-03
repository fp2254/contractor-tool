import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const orgId = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (error || !code || !orgId) {
    return NextResponse.redirect(`${appUrl}/app/settings?square=error`);
  }

  const clientId = process.env.SQUARE_APP_ID!;
  const clientSecret = process.env.SQUARE_APP_SECRET!;
  const redirectUri = `${appUrl}/api/square/callback`;

  const baseUrl = process.env.SQUARE_SANDBOX === "true"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

  // Exchange code for access token
  const tokenRes = await fetch(`${baseUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenRes.json() as {
    access_token?: string;
    refresh_token?: string;
    merchant_id?: string;
    expires_at?: string;
    errors?: { detail: string }[];
  };

  if (!tokenRes.ok || !tokenData.access_token) {
    console.error("[Square OAuth] Token exchange failed:", tokenData.errors);
    return NextResponse.redirect(`${appUrl}/app/settings?square=error`);
  }

  // Fetch the default location
  const apiBase = process.env.SQUARE_SANDBOX === "true"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

  const locRes = await fetch(`${apiBase}/v2/locations`, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Square-Version": "2024-01-18",
    },
  });
  const locData = await locRes.json() as { locations?: { id: string; status: string }[] };
  const location = locData.locations?.find(l => l.status === "ACTIVE") ?? locData.locations?.[0];

  const admin = createAdminClient();

  // Upsert org_settings with Square credentials
  const { error: dbErr } = await (admin as any)
    .from("org_settings")
    .upsert({
      org_id: orgId,
      square_access_token: tokenData.access_token,
      square_refresh_token: tokenData.refresh_token ?? null,
      square_merchant_id: tokenData.merchant_id ?? null,
      square_location_id: location?.id ?? null,
      square_token_expires_at: tokenData.expires_at ?? null,
    }, { onConflict: "org_id" });

  if (dbErr) {
    console.error("[Square OAuth] DB save failed:", dbErr.message);
    return NextResponse.redirect(`${appUrl}/app/settings?square=error`);
  }

  return NextResponse.redirect(`${appUrl}/app/settings?square=connected`);
}
