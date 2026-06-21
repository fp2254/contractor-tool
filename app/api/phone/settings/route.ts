import { NextRequest, NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAddonStatus, addonNotActiveResponse } from "@/lib/addons";

export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const addon = await getAddonStatus(orgId, "phone_ai");
  if (!addon.active) return addonNotActiveResponse("phone_ai");

  const admin = createAdminClient();
  const { data } = await (admin as any)
    .from("org_phone_settings")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  const defaults = {
    routing_mode: "ai_fallback",
    contractor_forward_number: null,
    ring_timeout_seconds: 20,
    record_calls: true,
    missed_call_sms_enabled: true,
    missed_call_sms_template:
      "Hi! You just called {business_name}. We missed you — we'll call you back shortly. Thanks!",
  };

  return NextResponse.json({ settings: data ?? defaults });
}

const VALID_ROUTING_MODES = ["contractor_first", "ai_first", "simultaneous", "ai_fallback"];

export async function POST(req: NextRequest) {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const addon = await getAddonStatus(orgId, "phone_ai");
  if (!addon.active) return addonNotActiveResponse("phone_ai");

  const body = await req.json().catch(() => ({}));

  if (body.routing_mode && !VALID_ROUTING_MODES.includes(body.routing_mode)) {
    return NextResponse.json({ error: "Invalid routing_mode" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await (admin as any)
    .from("org_phone_settings")
    .upsert(
      {
        org_id: orgId,
        routing_mode: body.routing_mode ?? "ai_fallback",
        contractor_forward_number: body.contractor_forward_number || null,
        ring_timeout_seconds: Number(body.ring_timeout_seconds) || 20,
        record_calls: body.record_calls !== false,
        missed_call_sms_enabled: body.missed_call_sms_enabled !== false,
        missed_call_sms_template:
          body.missed_call_sms_template ||
          "Hi! You just called {business_name}. We missed you — we'll call you back shortly. Thanks!",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  return NextResponse.json({ settings: data });
}
