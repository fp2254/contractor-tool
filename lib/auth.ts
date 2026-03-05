import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Database } from "@/lib/types";

function getAdminClient() {
  return createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function ensureDefaultTemplates(orgId: string, userId: string) {
  const admin = getAdminClient();
  const { data: existing } = await admin
    .from("message_templates")
    .select("id,channel")
    .eq("org_id", orgId)
    .eq("is_default", true);

  const hasSms = (existing ?? []).some((t) => t.channel === "sms");
  const hasEmail = (existing ?? []).some((t) => t.channel === "email");

  const inserts: any[] = [];
  if (!hasSms) {
    inserts.push({
      org_id: orgId,
      created_by: userId,
      name: "Default SMS Follow-Up",
      channel: "sms",
      body: "Hey {first_name}, just checking in on the quote I sent over. Want to get this on the schedule?",
      is_default: true,
    });
  }
  if (!hasEmail) {
    inserts.push({
      org_id: orgId,
      created_by: userId,
      name: "Default Email Follow-Up",
      channel: "email",
      subject: "Quick follow-up on your quote",
      body: "Hi {first_name}, just checking in on the quote I sent over. Happy to answer questions and get you on the schedule.",
      is_default: true,
    });
  }

  if (inserts.length > 0) {
    await admin.from("message_templates").insert(inserts);
  }
}

const TABLES_WITH_ORG_ID = [
  "customers",
  "quotes",
  "quote_items",
  "jobs",
  "invoices",
  "invoice_items",
  "leads",
  "notes",
  "message_templates",
  "org_settings",
  "service_presets",
  "customer_portal_tokens",
  "inventory_items",
  "trade_contacts",
  "payments",
  "followups",
];

async function consolidateDuplicateOrgs(
  realOrgId: string,
  duplicateOrgIds: string[],
  userId: string
) {
  if (duplicateOrgIds.length === 0) return;
  const admin = getAdminClient();

  for (const table of TABLES_WITH_ORG_ID) {
    try {
      await (admin as any)
        .from(table)
        .update({ org_id: realOrgId })
        .in("org_id", duplicateOrgIds);
    } catch {
      // table may not exist — skip
    }
  }

  await admin
    .from("org_members")
    .delete()
    .in("org_id", duplicateOrgIds)
    .eq("user_id", userId);

  for (const orgId of duplicateOrgIds) {
    try {
      await admin.from("orgs").delete().eq("id", orgId);
    } catch {
      // FK constraints may prevent deletion — leave the org shell
    }
  }
}

export async function ensureUserOrg() {
  const supabase = await createClient();
  const { data: userResp, error: userError } = await supabase.auth.getUser();

  if (userError || !userResp.user) {
    return null;
  }

  const userId = userResp.user.id;
  const admin = getAdminClient();

  const { data: members } = await admin
    .from("org_members")
    .select("org_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (members && members.length > 0) {
    const realOrgId = members[0].org_id;

    if (members.length > 1) {
      const duplicateOrgIds = members.slice(1).map((m) => m.org_id);
      consolidateDuplicateOrgs(realOrgId, duplicateOrgIds, userId).catch(
        () => {}
      );
    }

    await ensureDefaultTemplates(realOrgId, userId);
    return realOrgId;
  }

  const { data: org, error: orgError } = await admin
    .from("orgs")
    .insert({
      name: userResp.user.email
        ? `${userResp.user.email.split("@")[0]}'s Company`
        : "My Company",
      owner_user_id: userId,
    })
    .select("id")
    .single();

  if (orgError || !org) throw orgError;

  const { error: memberError } = await admin
    .from("org_members")
    .insert({ org_id: org.id, user_id: userId, role: "owner" });

  if (memberError) throw memberError;

  await ensureDefaultTemplates(org.id, userId);
  return org.id;
}
