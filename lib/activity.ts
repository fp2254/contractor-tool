import { createAdminClient } from "@/lib/supabase/admin";

export type ActivityEntityType = "lead" | "customer" | "quote" | "job" | "invoice" | "expense" | "note";

export interface LogActivityParams {
  orgId: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: string;
  description: string;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget activity log. Uses admin client so it works in server
 * actions and API routes without needing cookie context. Never throws.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("activity_log").insert({
      org_id: params.orgId,
      user_id: params.userId ?? null,
      entity_type: params.entityType,
      entity_id: params.entityId,
      action: params.action,
      description: params.description,
      metadata_json: params.metadata ?? null,
    });
  } catch {
    // intentionally silent — logging must never break the main action
  }
}
