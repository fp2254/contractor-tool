import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { checkAiLimit, DEFAULT_DAILY_LIMIT, DEFAULT_MONTHLY_LIMIT } from "@/lib/ai/limits";

export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await ensureUserOrg();
  const status = await checkAiLimit(orgId!);
  return NextResponse.json({
    used: status.used,
    dailyLimit: status.dailyLimit,
    monthlyUsed: status.monthlyUsed,
    monthlyLimit: status.monthlyLimit,
    remaining: Math.max(status.dailyLimit - status.used, 0),
    warning: status.warning ?? null,
    limitReached: !status.allowed,
  });
}
