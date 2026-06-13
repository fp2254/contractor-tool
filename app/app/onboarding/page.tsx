import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import OnboardingWizard from "./OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient() as any;

  const [{ data: org }, { data: settings }] = await Promise.all([
    admin.from("orgs").select("name").eq("id", orgId!).single(),
    admin.from("org_settings").select("owner_name,primary_phone,city").eq("org_id", orgId!).maybeSingle(),
  ]);

  const alreadySetUp = !!(settings?.primary_phone || settings?.city);
  if (alreadySetUp) redirect("/app");

  return (
    <OnboardingWizard
      businessName={org?.name ?? ""}
      ownerName={settings?.owner_name ?? ""}
    />
  );
}
