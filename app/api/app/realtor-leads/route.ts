import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export async function GET() {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient() as any;

  const { data, error } = await admin
    .from("leads")
    .select(`
      id, name, phone, email, status, job_type, notes, created_at,
      realtor_profile_id,
      realtor_profiles ( display_name, agency_name, phone, avatar_url )
    `)
    .eq("org_id", orgId)
    .eq("is_realtor_request", true)
    .order("created_at", { ascending: false });

  if (error?.code === "PGRST205" || error?.message?.includes("is_realtor_request") || error?.message?.includes("realtor_profile_id")) {
    return NextResponse.json({ leads: [], migrationPending: true });
  }

  return NextResponse.json({ leads: data ?? [] });
}
