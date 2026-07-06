import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureRealtorProfile, computeProfileCompletion } from "@/lib/realtor";
import RealtorShell from "./RealtorShell";

export const metadata = { title: "TradeBase — Realtor" };

export default async function RealtorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/realtor");

  const fallbackName =
    user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Realtor";

  const profile = await ensureRealtorProfile(user.id, fallbackName);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-bold text-slate-800 mb-2">Realtor accounts aren&apos;t set up yet</h1>
          <p className="text-sm text-gray-500">
            This feature is being configured. Please check back shortly.
          </p>
        </div>
      </div>
    );
  }

  const completion = computeProfileCompletion(profile);

  return (
    <RealtorShell
      displayName={profile.display_name}
      avatarUrl={profile.avatar_url}
      profileCompletion={completion}
      slug={profile.slug}
    >
      {children}
    </RealtorShell>
  );
}
