import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { OfflineBanner } from "@/components/OfflineBanner";
import { GracePeriodBanner } from "@/components/GracePeriodBanner";
import { createClient } from "@/lib/supabase/server";
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

  const orgId = await ensureUserOrg();

  if (!orgId) redirect("/auth/login");

  const sub = await getSubscriptionState(orgId);

  if (sub.state === "expired" || sub.state === "canceled") {
    redirect("/expired");
  }

  return (
    <>
      <OfflineBanner />
      {sub.state === "grace_period" && sub.daysLeftInGrace !== undefined && (
        <GracePeriodBanner daysLeft={sub.daysLeftInGrace} />
      )}
      <AppShell>{children}</AppShell>
    </>
  );
}
