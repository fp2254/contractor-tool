import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import HomeownerShell from "./HomeownerShell";

export const metadata = { title: "TradeBase — Homeowner" };

export default async function HomeownerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/homeowner");

  const admin = createAdminClient();

  // Provision homeowner profile on first visit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: profile } = await (admin as any)
    .from("homeowner_profiles")
    .select("id,display_name,avatar_url,profile_completion")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Homeowner";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created } = await (admin as any)
      .from("homeowner_profiles")
      .insert({ user_id: user.id, display_name: displayName })
      .select("id,display_name,avatar_url,profile_completion")
      .single();
    profile = created;
  }

  return (
    <HomeownerShell
      profileId={profile?.id ?? ""}
      displayName={profile?.display_name ?? ""}
      avatarUrl={profile?.avatar_url ?? null}
      profileCompletion={profile?.profile_completion ?? 0}
    >
      {children}
    </HomeownerShell>
  );
}
