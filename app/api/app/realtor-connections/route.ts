import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient() as any;

  const { data, error } = await admin
    .from("realtor_connections")
    .select(`
      id, status, message, created_at, updated_at,
      realtor_profiles ( id, display_name, agency_name, phone, avatar_url, slug )
    `)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error?.code === "PGRST205" || error?.message?.includes("realtor_connections")) {
    return NextResponse.json({ connections: [], migrationPending: true });
  }

  return NextResponse.json({ connections: data ?? [] });
}
