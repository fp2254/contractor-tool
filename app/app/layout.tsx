import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { OfflineBanner } from "@/components/OfflineBanner";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  await ensureUserOrg();

  return (
    <>
      <OfflineBanner />
      <AppShell>{children}</AppShell>
    </>
  );
}
