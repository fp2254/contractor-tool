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

  const { data, error } = await admin
    .from("leads")
    .select(`
      id, name, phone, email, status, job_type, notes, created_at, org_id,
      orgs ( name )
    `)
    .eq("realtor_profile_id", profile.id)
    .eq("is_realtor_request", true)
    .order("created_at", { ascending: false });

  if (error?.code === "PGRST205" || error?.message?.includes("realtor_profile_id") || error?.message?.includes("is_realtor_request")) {
    return NextResponse.json({ requests: [], migrationPending: true });
  }

  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getRealtorProfileByUserId(user.id);
  if (!profile) return NextResponse.json({ error: "No realtor profile" }, { status: 404 });

  const body = await req.json() as {
    connection_id: string;
    org_id: string;
    client_name: string;
    client_phone?: string;
    client_email?: string;
    client_address?: string;
    job_type?: string;
    description?: string;
  };

  const { connection_id, org_id, client_name, client_phone, client_email, client_address, job_type, description } = body;
  if (!connection_id || !org_id || !client_name?.trim()) {
    return NextResponse.json({ error: "connection_id, org_id, and client_name are required" }, { status: 400 });
  }

  const admin = createAdminClient() as any;

  // Verify the connection is accepted
  const { data: conn } = await admin
    .from("realtor_connections")
    .select("id, status")
    .eq("id", connection_id)
    .eq("realtor_profile_id", profile.id)
    .eq("org_id", org_id)
    .maybeSingle();

  if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  if (conn.status !== "accepted") return NextResponse.json({ error: "Connection must be accepted first" }, { status: 403 });

  const notes = [
    `[Realtor Request from ${profile.display_name}${profile.agency_name ? ` — ${profile.agency_name}` : ""}]`,
    description?.trim() ? description.trim() : null,
  ].filter(Boolean).join("\n\n");

  const leadRow: Record<string, unknown> = {
    org_id,
    name: client_name.trim(),
    phone: client_phone?.trim() || null,
    email: client_email?.trim() || null,
    address: client_address?.trim() || null,
    job_type: job_type?.trim() || null,
    notes,
    lead_source: "Realtor",
    status: "new",
    is_realtor_request: true,
    realtor_connection_id: connection_id,
    realtor_profile_id: profile.id,
  };

  const { data: lead, error } = await admin.from("leads").insert(leadRow).select("id").single();

  if (error) {
    // If realtor columns don't exist yet (migration pending), create without them
    if (error.message?.includes("is_realtor_request") || error.message?.includes("realtor_connection_id") || error.message?.includes("realtor_profile_id")) {
      const fallbackRow = {
        org_id,
        name: client_name.trim(),
        phone: client_phone?.trim() || null,
        email: client_email?.trim() || null,
        address: client_address?.trim() || null,
        job_type: job_type?.trim() || null,
        notes,
        lead_source: "Realtor",
        status: "new",
      };
      const { data: fallbackLead, error: fb } = await admin.from("leads").insert(fallbackRow).select("id").single();
      if (fb) return NextResponse.json({ error: fb.message }, { status: 500 });
      return NextResponse.json({ ok: true, leadId: fallbackLead?.id, migrationPending: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, leadId: lead?.id });
}
