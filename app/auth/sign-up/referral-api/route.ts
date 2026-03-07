import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json() as { code?: string; referred_email?: string; referred_user_id?: string };
    const { code, referred_email, referred_user_id } = body;
    if (!code) return NextResponse.json({ ok: false });

    const admin = createAdminClient();

    const { data: refCode } = await (admin as any)
      .from("referral_codes")
      .select("user_id, org_id")
      .eq("code", code.toUpperCase())
      .maybeSingle();

    if (!refCode) return NextResponse.json({ ok: false, reason: "code_not_found" });

    await (admin as any).from("referrals").insert({
      referrer_user_id: refCode.user_id,
      referrer_org_id: refCode.org_id,
      code: code.toUpperCase(),
      referred_email: referred_email ?? null,
      referred_user_id: referred_user_id ?? null,
      status: "pending",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
