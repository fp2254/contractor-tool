import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRealtorProfileByUserId } from "@/lib/realtor";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getRealtorProfileByUserId(user.id);
  if (!profile) return NextResponse.json({ error: "No realtor profile" }, { status: 404 });

  const admin = createAdminClient() as any;

  const { data: connections, error } = await admin
    .from("realtor_connections")
    .select(`
      id, status, message, created_at, updated_at, org_id,
      orgs ( name )
    `)
    .eq("realtor_profile_id", profile.id)
    .order("created_at", { ascending: false });

  if (error?.code === "PGRST205" || error?.message?.includes("realtor_connections")) {
    return NextResponse.json({ connections: [], migrationPending: true });
  }

  return NextResponse.json({ connections: connections ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getRealtorProfileByUserId(user.id);
  if (!profile) return NextResponse.json({ error: "No realtor profile" }, { status: 404 });

  const { org_id, message } = await req.json() as { org_id: string; message?: string };
  if (!org_id) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const admin = createAdminClient() as any;

  const { data, error } = await admin
    .from("realtor_connections")
    .upsert(
      { realtor_profile_id: profile.id, org_id, message: message?.trim() || null, status: "pending", updated_at: new Date().toISOString() },
      { onConflict: "realtor_profile_id,org_id", ignoreDuplicates: false }
    )
    .select("id, status")
    .single();

  if (error) {
    if (error.code === "PGRST205" || error.message?.includes("realtor_connections")) {
      return NextResponse.json({ error: "migration_pending" }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, connection: data });
}
