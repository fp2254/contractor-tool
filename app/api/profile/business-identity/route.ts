import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function geocodeAddress(
  address: string,
  city: string,
  state: string,
  zip: string
): Promise<{ lat: number; lng: number } | null> {
  const parts = [address, city, state, zip].filter(Boolean);
  if (parts.length < 2) return null;

  const query = encodeURIComponent(parts.join(", ") + ", USA");
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=us`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TradeBase/1.0 (tradebase.contractors)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (!data?.[0]?.lat || !data?.[0]?.lon) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const body = await req.json() as Record<string, string | null>;

  const businessName = (body.business_name ?? "").trim();
  if (businessName) {
    const { error: orgErr } = await admin
      .from("orgs")
      .update({ name: businessName })
      .eq("id", orgId!);
    if (orgErr) {
      console.error("[business-identity] orgs update error:", orgErr.message);
      return NextResponse.json({ error: `Could not save business name: ${orgErr.message}` }, { status: 400 });
    }
  }

  const address = (body.address ?? "").trim();
  const city = (body.city ?? "").trim();
  const state = (body.state ?? "").trim();
  const zip = (body.zip ?? "").trim();

  const settingsPayload: Record<string, unknown> = {
    org_id: orgId!,
    dba_name: body.dba_name || null,
    primary_phone: body.primary_phone || null,
    business_email: body.business_email || null,
    website: body.website || null,
    address: address || null,
    city: city || null,
    state: state || null,
    zip: zip || null,
    license_number: body.license_number || null,
    insurance_number: body.insurance_number || null,
    epa_cert_number: body.epa_cert_number || null,
    service_area: body.service_area || null,
    owner_name: body.owner_name || null,
    owner_title: body.owner_title || null,
    signature_footer: body.signature_footer || null,
  };
  if (body.logo_url !== undefined) {
    settingsPayload.logo_url = body.logo_url || null;
  }

  // Geocode whenever we have at least city+state
  let geocoded = false;
  if (city && state) {
    const coords = await geocodeAddress(address, city, state, zip);
    if (coords) {
      settingsPayload.lat = coords.lat;
      settingsPayload.lng = coords.lng;
      settingsPayload.geocoded_at = new Date().toISOString();
      geocoded = true;
      console.log(`[business-identity] geocoded ${city}, ${state} → ${coords.lat}, ${coords.lng}`);
    } else {
      console.warn(`[business-identity] geocoding failed for ${city}, ${state}`);
    }
  } else if (!city && !state) {
    // Clear coords if address is wiped
    settingsPayload.lat = null;
    settingsPayload.lng = null;
    settingsPayload.geocoded_at = null;
  }

  const { error: settingsErr } = await admin
    .from("org_settings")
    .upsert(settingsPayload, { onConflict: "org_id" });

  if (settingsErr) {
    console.error("[business-identity] org_settings upsert error:", settingsErr.message);
    return NextResponse.json({ error: `Could not save settings: ${settingsErr.message}` }, { status: 400 });
  }

  revalidatePath("/app/profile");
  return NextResponse.json({ success: true, geocoded });
}
