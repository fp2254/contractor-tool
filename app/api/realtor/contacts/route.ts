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
    .from("realtor_contacts")
    .select("id, name, phone, email, company, notes, created_at")
    .eq("realtor_profile_id", profile.id)
    .order("created_at", { ascending: false });

  if (error?.code === "PGRST205" || error?.message?.includes("realtor_contacts")) {
    return NextResponse.json({ contacts: [], migrationPending: true });
  }

  return NextResponse.json({ contacts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getRealtorProfileByUserId(user.id);
  if (!profile) return NextResponse.json({ error: "No realtor profile" }, { status: 404 });

  const body = await req.json() as { name: string; phone?: string; email?: string; company?: string; notes?: string };
  if (!body.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from("realtor_contacts")
    .insert({
      realtor_profile_id: profile.id,
      name: body.name.trim(),
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      company: body.company?.trim() || null,
      notes: body.notes?.trim() || null,
    })
    .select("id, name, phone, email, company, notes, created_at")
    .single();

  if (error) {
    if (error.code === "PGRST205" || error.message?.includes("realtor_contacts")) {
      return NextResponse.json({ error: "migration_pending" }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, contact: data });
}
