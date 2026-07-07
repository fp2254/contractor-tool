import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRealtorProfileByUserId } from "@/lib/realtor";
import { createAdminClient } from "@/lib/supabase/admin";
import ConnectionsClient from "./ConnectionsClient";

export default async function RealtorConnectionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/realtor/connections");

  const profile = await getRealtorProfileByUserId(user.id);
  if (!profile) redirect("/realtor");

  const admin = createAdminClient() as any;

  const { data: connections, error } = await admin
    .from("realtor_connections")
    .select(`
      id, status, message, created_at, updated_at, org_id,
      orgs ( name )
    `)
    .eq("realtor_profile_id", profile.id)
    .order("created_at", { ascending: false });

  const migrationPending = !!(error?.code === "PGRST205" || error?.message?.includes("realtor_connections"));

  return (
    <ConnectionsClient
      connections={connections ?? []}
      migrationPending={migrationPending}
      realtorProfileId={profile.id}
    />
  );
}
