import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import WaitlistAdminClient from "../../../admin/waitlist/WaitlistAdminClient";

export default async function AdminWaitlistPage() {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data: entries } = await (admin as any)
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-800 mt-2">Waitlist ({entries?.length ?? 0})</h1>
      <WaitlistAdminClient entries={entries ?? []} />
    </div>
  );
}
