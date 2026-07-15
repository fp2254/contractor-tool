import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { OfflineBanner } from "@/components/OfflineBanner";
import { GracePeriodBanner } from "@/components/GracePeriodBanner";
import { DemoBanner } from "@/components/DemoBanner";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { getSubscriptionState } from "@/lib/subscription";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Realtor accounts are a separate account type — never auto-provision a
  // contractor org for them, and keep them out of the contractor CRM.
  if (user.user_metadata?.account_type === "realtor") redirect("/realtor");

  const orgId = await ensureUserOrg();

  if (!orgId) redirect("/auth/login");

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orgRow } = await (admin as any)
    .from("orgs")
    .select("is_demo")
    .eq("id", orgId)
    .single();
  const isDemo = orgRow?.is_demo === true;

  // Demo pause gate — sign out demo sessions and redirect to login
  if (isDemo && process.env.DEMO_PAUSED === "true") {
    redirect("/auth/signout");
  }

  let graceDaysLeft: number | undefined;

  if (!isDemo) {
    const sub = await getSubscriptionState(orgId);
    if (sub.state === "expired" || sub.state === "canceled") {
      redirect("/expired");
    }
    if (sub.state === "grace_period" && sub.daysLeftInGrace !== undefined) {
      graceDaysLeft = sub.daysLeftInGrace;
    }
  }

  const userEmail = user.email ?? "";
  const userMeta = user.user_metadata ?? {};
  const userName: string =
    userMeta.full_name ?? userMeta.name ?? userEmail.split("@")[0] ?? "";

  return (
    <>
      <OfflineBanner />
      {isDemo && <DemoBanner />}
      {graceDaysLeft !== undefined && <GracePeriodBanner daysLeft={graceDaysLeft} />}
      <AppShell userEmail={userEmail} userName={userName}>{children}</AppShell>
    </>
  );
}
