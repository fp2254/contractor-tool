import { createAdminClient } from "@/lib/supabase/admin";

export type MembershipStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired"
  | "comped"
  | "paused"
  | "none";

export type MembershipPlan =
  | "founder"
  | "standard"
  | "comp"
  | "none";

export interface MembershipInfo {
  status: MembershipStatus;
  plan: MembershipPlan;
  hasAccess: boolean;
  reason: string;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  compedUntil?: string | null;
}

export async function getMembershipInfo(orgId: string): Promise<MembershipInfo> {
  const admin = createAdminClient();
  const now = new Date();

  const { data: mem, error } = await (admin as any)
    .from("org_memberships")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error || !mem) {
    const { data: sub } = await (admin as any)
      .from("subscriptions")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle();

    if (!sub) {
      return { status: "none", plan: "none", hasAccess: false, reason: "No membership record" };
    }

    const nextDue = new Date(sub.next_due_date);
    const graceEnd = new Date(sub.grace_period_end_date);

    if (sub.subscription_status === "canceled" && now > graceEnd) {
      return { status: "canceled", plan: sub.plan_type ?? "standard", hasAccess: false, reason: "Canceled" };
    }
    if (now <= nextDue) {
      return { status: "active", plan: sub.plan_type ?? "standard", hasAccess: true, reason: "Active subscription" };
    }
    if (now > nextDue && now <= graceEnd) {
      return { status: "past_due", plan: sub.plan_type ?? "standard", hasAccess: true, reason: "In grace period" };
    }
    return { status: "expired", plan: sub.plan_type ?? "standard", hasAccess: false, reason: "Expired" };
  }

  const status: MembershipStatus = mem.status ?? "none";
  const plan: MembershipPlan = mem.plan ?? "none";

  switch (status) {
    case "active":
      if (mem.current_period_end && now > new Date(mem.current_period_end)) {
        return { status: "expired", plan, hasAccess: false, reason: "Period ended", currentPeriodEnd: mem.current_period_end };
      }
      return { status: "active", plan, hasAccess: true, reason: "Active", currentPeriodEnd: mem.current_period_end };

    case "trialing":
      if (mem.trial_ends_at && now > new Date(mem.trial_ends_at)) {
        return { status: "expired", plan, hasAccess: false, reason: "Trial ended", trialEndsAt: mem.trial_ends_at };
      }
      return { status: "trialing", plan, hasAccess: true, reason: "In trial", trialEndsAt: mem.trial_ends_at };

    case "comped":
      if (mem.comped_until && now > new Date(mem.comped_until)) {
        return { status: "expired", plan, hasAccess: false, reason: "Comp expired", compedUntil: mem.comped_until };
      }
      return { status: "comped", plan, hasAccess: true, reason: mem.comped_until ? "Comped access" : "Comp (indefinite)", compedUntil: mem.comped_until };

    case "past_due":
      return { status: "past_due", plan, hasAccess: true, reason: "Past due (grace)", currentPeriodEnd: mem.current_period_end };

    case "paused":
      return { status: "paused", plan, hasAccess: false, reason: "Paused" };

    case "canceled":
      return { status: "canceled", plan, hasAccess: false, reason: "Canceled" };

    case "expired":
      return { status: "expired", plan, hasAccess: false, reason: "Expired" };

    default:
      return { status: "none", plan: "none", hasAccess: false, reason: "No active membership" };
  }
}
