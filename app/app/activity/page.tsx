import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import ActivityClient from "./ActivityClient";

export default async function ActivityPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  let logs: {
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    description: string | null;
    created_at: string;
    user_id: string | null;
  }[] = [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from("activity_log")
      .select("id,entity_type,entity_id,action,description,created_at,user_id")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false })
      .limit(200);
    logs = data ?? [];
  } catch {
    logs = [];
  }

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold text-slate-800">Activity Log</h1>
      <ActivityClient logs={logs} />
    </div>
  );
}
