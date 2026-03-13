"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { activateSubscription } from "@/lib/subscription";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function assertAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const adminEmails = (process.env.ADMIN_EMAIL ?? "").split(",").map((e) => e.trim().toLowerCase());
  if (!adminEmails.includes(user.email?.toLowerCase() ?? "")) {
    throw new Error("Not authorized");
  }
  return user;
}

export async function logPaymentAction(formData: FormData) {
  await assertAdmin();
  const admin = getAdmin();

  const payload = {
    payer_name: String(formData.get("payer_name") ?? "").trim(),
    payer_email: String(formData.get("payer_email") ?? "").trim().toLowerCase(),
    plan_type: String(formData.get("plan_type") ?? "monthly"),
    amount: parseFloat(String(formData.get("amount") ?? "0")),
    payment_date: String(formData.get("payment_date") ?? new Date().toISOString().slice(0, 10)),
    notes: String(formData.get("notes") ?? "").trim() || null,
    status: "pending_review",
  };

  const { error } = await (admin as any).from("payment_notifications").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/app/admin/billing");
}

export async function approveNotificationAction(notificationId: string, payerEmail: string, planType: string) {
  await assertAdmin();
  const admin = getAdmin();

  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const matched = users?.users?.find((u: any) => u.email?.toLowerCase() === payerEmail.toLowerCase());

  if (!matched) {
    throw new Error(`No TradeBase account found for email: ${payerEmail}`);
  }

  const { data: members } = await (admin as any)
    .from("org_members")
    .select("org_id")
    .eq("user_id", matched.id)
    .limit(1);

  if (!members || members.length === 0) {
    throw new Error(`No organization found for user: ${payerEmail}`);
  }

  const orgId = members[0].org_id;

  await activateSubscription(orgId, matched.id, planType as "monthly" | "yearly");

  await (admin as any)
    .from("payment_notifications")
    .update({ status: "approved", matched_org_id: orgId })
    .eq("id", notificationId);

  revalidatePath("/app/admin/billing");
}

export async function ignoreNotificationAction(notificationId: string) {
  await assertAdmin();
  const admin = getAdmin();

  await (admin as any)
    .from("payment_notifications")
    .update({ status: "ignored" })
    .eq("id", notificationId);

  revalidatePath("/app/admin/billing");
}
