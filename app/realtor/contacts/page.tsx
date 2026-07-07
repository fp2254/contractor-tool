import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRealtorProfileByUserId } from "@/lib/realtor";
import { createAdminClient } from "@/lib/supabase/admin";
import ContactsClient from "./ContactsClient";

export default async function RealtorContactsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/realtor/contacts");

  const profile = await getRealtorProfileByUserId(user.id);
  if (!profile) redirect("/realtor");

  const admin = createAdminClient() as any;

  const { data: contacts, error } = await admin
    .from("realtor_contacts")
    .select("id, name, phone, email, company, notes, created_at")
    .eq("realtor_profile_id", profile.id)
    .order("created_at", { ascending: false });

  const migrationPending = !!(error?.code === "PGRST205" || error?.message?.includes("realtor_contacts"));

  return (
    <ContactsClient
      contacts={contacts ?? []}
      migrationPending={migrationPending}
    />
  );
}
