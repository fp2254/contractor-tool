import { createClient } from "@supabase/supabase-js";

export type SubscriptionState =
  | "active"
  | "grace_period"
  | "expired"
  | "canceled"
  | "none";

export interface SubscriptionInfo {
  state: SubscriptionState;
  daysLeftInGrace?: number;
  nextDueDate?: string;
  gracePeriodEndDate?: string;
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function getSubscriptionState(
  orgId: string
): Promise<SubscriptionInfo> {
  const admin = getAdmin();

  const { data: sub } = await (admin as any)
    .from("subscriptions")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!sub) {
    return { state: "none" };
  }

  const now = new Date();
  const nextDue = new Date(sub.next_due_date);
  const graceEnd = new Date(sub.grace_period_end_date);

  let state: SubscriptionState;
  let daysLeftInGrace: number | undefined;

  if (sub.subscription_status === "canceled" && now > graceEnd) {
    state = "expired";
  } else if (now <= nextDue) {
    state = "active";
  } else if (now > nextDue && now <= graceEnd) {
    state = "grace_period";
    const msLeft = graceEnd.getTime() - now.getTime();
    daysLeftInGrace = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  } else {
    state = "expired";
  }

  (admin as any)
    .from("subscriptions")
    .update({ subscription_status: state })
    .eq("org_id", orgId)
    .then(() => {});

  return {
    state,
    daysLeftInGrace,
    nextDueDate: sub.next_due_date,
    gracePeriodEndDate: sub.grace_period_end_date,
  };
}

export async function activateSubscription(
  orgId: string,
  userId: string,
  planType: "monthly" | "yearly",
  paymentProviderId?: string
) {
  const admin = getAdmin();
  const now = new Date();
  const daysToAdd = planType === "yearly" ? 365 : 30;

  const nextDue = new Date(now);
  nextDue.setDate(nextDue.getDate() + daysToAdd);

  const graceEnd = new Date(nextDue);
  graceEnd.setDate(graceEnd.getDate() + 5);

  const payload = {
    org_id: orgId,
    user_id: userId,
    plan_type: planType,
    payment_date: now.toISOString(),
    next_due_date: nextDue.toISOString(),
    grace_period_end_date: graceEnd.toISOString(),
    subscription_status: "active",
    ...(paymentProviderId ? { payment_provider_id: paymentProviderId } : {}),
  };

  const { error } = await (admin as any)
    .from("subscriptions")
    .upsert(payload, { onConflict: "org_id" });

  if (error) throw error;
}
