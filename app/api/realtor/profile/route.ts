import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRealtorProfileByUserId, publishRealtorSlug } from "@/lib/realtor";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getRealtorProfileByUserId(user.id);
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getRealtorProfileByUserId(user.id);
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const wantsPublish = body.is_published === true && !profile.is_published;

  await admin
    .from("realtor_profiles")
    .update({
      display_name: body.display_name?.trim() || profile.display_name,
      agency_name: body.agency_name?.trim() || null,
      license_number: body.license_number?.trim() || null,
      phone: body.phone?.trim() || null,
      bio: body.bio?.trim() || null,
      avatar_url: body.avatar_url?.trim() || null,
      service_area: body.service_area?.trim() || null,
      is_published: typeof body.is_published === "boolean" ? body.is_published : profile.is_published,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  let slug = profile.slug;
  if (wantsPublish && !slug) {
    slug = await publishRealtorSlug(profile.id, body.display_name?.trim() || profile.display_name);
  }

  return NextResponse.json({ ok: true, slug });
}
