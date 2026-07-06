import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRealtorProfileByUserId } from "@/lib/realtor";
import SettingsClient from "./SettingsClient";

export default async function RealtorSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/realtor/settings");

  const profile = await getRealtorProfileByUserId(user.id);
  if (!profile) redirect("/realtor");

  return <SettingsClient profile={profile} />;
}
