import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TABLES_WITH_ORG = [
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
];

const OPTIONAL_TABLES = [
  "inventory_items",
  "trade_contacts",
  "payments",
  "followups",
];

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: members, error: membersErr } = await admin
    .from("org_members")
    .select("org_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (membersErr || !members || members.length === 0) {
    return NextResponse.json({ error: "No orgs found" }, { status: 404 });
  }

  if (members.length === 1) {
    return NextResponse.json({ message: "Only one org — nothing to clean up." });
  }

  const realOrgId = members[0].org_id;
  const duplicateOrgIds = members.slice(1).map((m) => m.org_id);

  const results: Record<string, number> = {};

  for (const table of TABLES_WITH_ORG) {
    try {
      const { count } = await admin
        .from(table as any)
        .update({ org_id: realOrgId })
        .in("org_id", duplicateOrgIds)
        .select("id", { count: "exact", head: true });
      results[table] = count ?? 0;
    } catch {
      results[table] = -1;
    }
  }

  for (const table of OPTIONAL_TABLES) {
    try {
      const { count } = await admin
        .from(table as any)
        .update({ org_id: realOrgId })
        .in("org_id", duplicateOrgIds)
        .select("id", { count: "exact", head: true });
      results[table] = count ?? 0;
    } catch {
      results[table] = 0;
    }
  }

  await admin
    .from("org_members")
    .delete()
    .in("org_id", duplicateOrgIds)
    .eq("user_id", user.id);

  for (const orgId of duplicateOrgIds) {
    try {
      await admin.from("orgs").delete().eq("id", orgId);
    } catch {
      // ignore FK constraint issues
    }
  }

  return NextResponse.json({
    message: `Consolidated ${duplicateOrgIds.length} duplicate org(s) into ${realOrgId}`,
    realOrgId,
    duplicatesRemoved: duplicateOrgIds.length,
    recordsMoved: results,
  });
}
