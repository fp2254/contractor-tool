import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  enabled: false,
  auto_reply: false,
  ai_schedules: false,
  voicemail_only: false,
  full_conversation: false,
  require_booking_approval: true,
  show_pricing: false,
  transcribe_voicemail: false,
  greeting_name: "",
  tone: "casual",
  business_hours: { days: ["mon", "tue", "wed", "thu", "fri"], open: "07:00", close: "17:00" },
  service_area: "",
  disabled_service_ids: [] as string[],
  pricing_ranges: [] as { preset_id: string; label: string; min: string; max: string }[],
  qualifier_questions: [] as string[],
  faqs: [] as { q: string; a: string }[],
  followup_max_attempts: 2,
  followup_delay_days: 3,
};

export async function GET() {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("org_ai_assistant_config")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  return NextResponse.json(data ?? { ...DEFAULTS, org_id: orgId });
}

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("org_ai_assistant_config")
    .upsert(
      {
        org_id: orgId,
        enabled: !!body.enabled,
        auto_reply: !!body.auto_reply,
        ai_schedules: !!body.ai_schedules,
        voicemail_only: !!body.voicemail_only,
        full_conversation: !!body.full_conversation,
        require_booking_approval: !!body.require_booking_approval,
        show_pricing: !!body.show_pricing,
        transcribe_voicemail: !!body.transcribe_voicemail,
        greeting_name: body.greeting_name ?? null,
        tone: body.tone === "professional" ? "professional" : "casual",
        business_hours: body.business_hours ?? DEFAULTS.business_hours,
        service_area: body.service_area ?? null,
        disabled_service_ids: body.disabled_service_ids ?? [],
        pricing_ranges: body.pricing_ranges ?? [],
        qualifier_questions: body.qualifier_questions ?? [],
        faqs: body.faqs ?? [],
        followup_max_attempts: Math.min(5, Math.max(1, Number(body.followup_max_attempts) || 2)),
        followup_delay_days: Math.min(14, Math.max(1, Number(body.followup_delay_days) || 3)),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
