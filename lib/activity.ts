import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

export async function logActivity(params: {
  entity_type: "job" | "quote" | "invoice" | "payment" | "lead";
  entity_id: string;
  action: string;
  description: string;
}) {
  const supabase = await createClient();
  const orgId = await ensureUserOrg();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!orgId || !user) return;

  await supabase.from("activity_log").insert({
    org_id: orgId,
    user_id: user.id,
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    action: params.action,
    description: params.description,
  });
}
