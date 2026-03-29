import { createAdminClient } from "@/lib/supabase/admin";

// ─── Defaults ────────────────────────────────────────────────────────────────
export const DEFAULT_DAILY_LIMIT = 50;
export const DEFAULT_MONTHLY_LIMIT = 500;
const WARN_PCT = 0.8; // warn at 80 % of daily limit

// ─── Types ───────────────────────────────────────────────────────────────────
export type LimitStatus = {
  allowed: boolean;
  used: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
  /** Present when >= 80 % of daily limit is used but the request is still allowed */
  warning?: string;
  /** Present when the hard limit is hit */
  error?: string;
};

// ─── Core check ──────────────────────────────────────────────────────────────
export async function checkAiLimit(orgId: string): Promise<LimitStatus> {
  const admin = createAdminClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // 1. Resolve per-org limits (billing hook).
  //    Falls back to defaults gracefully if the table doesn't exist yet.
  let dailyLimit = DEFAULT_DAILY_LIMIT;
  let monthlyLimit = DEFAULT_MONTHLY_LIMIT;
  try {
    const { data: orgLimit } = await (admin as any)
      .from("org_ai_limits")
      .select("daily_limit,monthly_limit")
      .eq("org_id", orgId)
      .maybeSingle();
    if (orgLimit) {
      dailyLimit = orgLimit.daily_limit ?? DEFAULT_DAILY_LIMIT;
      monthlyLimit = orgLimit.monthly_limit ?? DEFAULT_MONTHLY_LIMIT;
    }
  } catch {
    // Table not yet created — use defaults silently.
  }

  // 2. Count requests from ai_runs (already exists, no schema changes needed).
  const [{ count: dayCount }, { count: monCount }] = await Promise.all([
    (admin as any)
      .from("ai_runs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", todayStart),
    (admin as any)
      .from("ai_runs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", monthStart),
  ]);

  const used = dayCount ?? 0;
  const monthlyUsed = monCount ?? 0;

  // 3. Hard limit — block the request.
  if (used >= dailyLimit) {
    return {
      allowed: false,
      used,
      dailyLimit,
      monthlyUsed,
      monthlyLimit,
      error: `Daily AI limit reached (${used}/${dailyLimit} requests). Resets at midnight. Contact support to increase your limit.`,
    };
  }

  // 4. Soft warning — allow but inform.
  const warning =
    used >= Math.floor(dailyLimit * WARN_PCT)
      ? `Heads up: you've used ${used} of ${dailyLimit} AI requests today.`
      : undefined;

  return { allowed: true, used, dailyLimit, monthlyUsed, monthlyLimit, warning };
}
