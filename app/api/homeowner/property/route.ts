import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getHomeownerId(userId: string) {
  const a = createAdminClient() as any;
  const { data } = await a.from("homeowner_profiles").select("id").eq("user_id", userId).single();
  return data?.id ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const homeownerId = await getHomeownerId(user.id);
  if (!homeownerId) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const a = createAdminClient() as any;
  const { data } = await a.from("homeowner_properties").select("*").eq("homeowner_id", homeownerId).maybeSingle();
  return NextResponse.json({ property: data });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const homeownerId = await getHomeownerId(user.id);
  if (!homeownerId) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const a = createAdminClient() as any;

  const { data: existing } = await a.from("homeowner_properties").select("id").eq("homeowner_id", homeownerId).maybeSingle();

  const payload = {
    homeowner_id: homeownerId,
    property_type: body.property_type || "Single Family Home",
    sq_footage: body.sq_footage ? parseInt(body.sq_footage) : null,
    lot_size: body.lot_size || null,
    year_built: body.year_built ? parseInt(body.year_built) : null,
    bedrooms: body.bedrooms ? parseInt(body.bedrooms) : null,
    bathrooms: body.bathrooms ? parseFloat(body.bathrooms) : null,
    address: body.address || null,
    city: body.city || null,
    state: body.state || null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await a.from("homeowner_properties").update(payload).eq("id", existing.id);
  } else {
    await a.from("homeowner_properties").insert(payload);
  }

  await a.from("homeowner_profiles").update({ profile_completion: await calcCompletion(a, homeownerId, payload) })
    .eq("id", homeownerId);

  return NextResponse.json({ ok: true });
}

async function calcCompletion(a: any, homeownerId: string, property: any) {
  const { data: profile } = await a.from("homeowner_profiles").select("display_name,avatar_url,location").eq("id", homeownerId).single();
  let score = 0;
  if (profile?.display_name) score += 15;
  if (profile?.avatar_url) score += 15;
  if (profile?.location) score += 10;
  if (property?.year_built) score += 15;
  if (property?.sq_footage) score += 15;
  if (property?.property_type) score += 10;
  if (property?.bedrooms) score += 10;
  if (property?.address) score += 10;
  return Math.min(score, 100);
}
