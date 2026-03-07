import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function GET() {
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: userResp } = await supabase.auth.getUser();
  const userId = userResp.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 400 });

  let code: string;

  const { data: existing } = await (admin as any)
    .from("referral_codes")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.code) {
    code = existing.code;
  } else {
    code = generateCode();
    await (admin as any).from("referral_codes").insert({
      user_id: userId,
      org_id: orgId,
      code,
    });
  }

  const { data: referrals } = await (admin as any)
    .from("referrals")
    .select("id, referred_email, status, created_at")
    .eq("referrer_user_id", userId)
    .order("created_at", { ascending: false });

  const rows = (referrals ?? []) as {
    id: string;
    referred_email: string | null;
    status: string;
    created_at: string;
  }[];

  const totalReferred = rows.length;
  const activeReferrals = rows.filter((r) => r.status === "active").length;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data: payouts } = await (admin as any)
    .from("referral_payouts")
    .select("amount, subscription_month")
    .eq("referrer_user_id", userId)
    .eq("status", "paid");

  const allPayouts = (payouts ?? []) as { amount: number; subscription_month: string }[];
  const lifetimeEarnings = allPayouts.reduce((s, p) => s + Number(p.amount), 0);
  const monthlyEarnings = allPayouts
    .filter((p) => p.subscription_month === currentMonth)
    .reduce((s, p) => s + Number(p.amount), 0);

  return NextResponse.json({
    code,
    totalReferred,
    activeReferrals,
    monthlyEarnings,
    lifetimeEarnings,
    referrals: rows,
  });
}
