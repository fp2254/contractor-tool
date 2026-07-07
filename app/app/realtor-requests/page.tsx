import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import RealtorRequestsPageClient from "./RealtorRequestsPageClient";

export default async function RealtorRequestsPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient() as any;

  // Incoming connection requests
  let connections: any[] = [];
  const { data: conns, error: connErr } = await admin
    .from("realtor_connections")
    .select(`
      id, status, message, created_at, updated_at,
      realtor_profiles ( id, display_name, agency_name, phone, avatar_url, slug )
    `)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  const connsMigrationPending = !!(connErr?.code === "PGRST205" || connErr?.message?.includes("realtor_connections"));
  if (!connErr) connections = conns ?? [];

  // Realtor-originated leads
  let realtorLeads: any[] = [];
  const { data: leads, error: leadsErr } = await admin
    .from("leads")
    .select(`
      id, name, phone, email, status, job_type, notes, created_at, is_realtor_request, realtor_profile_id,
      realtor_profiles:realtor_profile_id ( display_name, agency_name )
    `)
    .eq("org_id", orgId)
    .eq("is_realtor_request", true)
    .order("created_at", { ascending: false });
  const leadsMigrationPending = !!(leadsErr?.code === "PGRST205" || leadsErr?.message?.includes("is_realtor_request") || leadsErr?.message?.includes("realtor_profile_id"));
  if (!leadsErr) realtorLeads = leads ?? [];

  return (
    <RealtorRequestsPageClient
      connections={connections}
      realtorLeads={realtorLeads}
      connsMigrationPending={connsMigrationPending}
      leadsMigrationPending={leadsMigrationPending}
    />
  );
}
