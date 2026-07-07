import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRealtorProfileByUserId } from "@/lib/realtor";
import { createAdminClient } from "@/lib/supabase/admin";
import RequestsClient from "./RequestsClient";

export default async function RealtorRequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/realtor/requests");

  const profile = await getRealtorProfileByUserId(user.id);
  if (!profile) redirect("/realtor");

  const admin = createAdminClient() as any;

  const { data: requests, error } = await admin
    .from("leads")
    .select(`
      id, name, phone, email, status, job_type, notes, created_at, org_id,
      orgs ( name )
    `)
    .eq("realtor_profile_id", profile.id)
    .eq("is_realtor_request", true)
    .order("created_at", { ascending: false });

  const migrationPending = !!(
    error?.code === "PGRST205" ||
    error?.message?.includes("realtor_profile_id") ||
    error?.message?.includes("is_realtor_request")
  );

  return (
    <RequestsClient
      requests={requests ?? []}
      migrationPending={migrationPending}
    />
  );
}
