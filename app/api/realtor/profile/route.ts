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

  const fullUpdate = {
    display_name: body.display_name?.trim() || profile.display_name,
    agency_name: body.agency_name?.trim() || null,
    license_number: body.license_number?.trim() || null,
    phone: body.phone?.trim() || null,
    bio: body.bio?.trim() || null,
    avatar_url: body.avatar_url?.trim() || null,
    service_area: body.service_area?.trim() || null,
    banner_url: body.banner_url?.trim() || null,
    years_experience: body.years_experience === "" || body.years_experience == null ? null : Number(body.years_experience),
    homes_sold: body.homes_sold === "" || body.homes_sold == null ? null : Number(body.homes_sold),
    sales_volume: body.sales_volume === "" || body.sales_volume == null ? null : Number(body.sales_volume),
    is_published: typeof body.is_published === "boolean" ? body.is_published : profile.is_published,
    updated_at: new Date().toISOString(),
  };

  let { error: updateError } = await admin
    .from("realtor_profiles")
    .update(fullUpdate)
    .eq("id", profile.id);

  // Graceful fallback if migration_realtor_showcase.sql hasn't been applied yet
  if (updateError) {
    const {
      banner_url: _banner_url,
      years_experience: _years_experience,
      homes_sold: _homes_sold,
      sales_volume: _sales_volume,
      ...basicUpdate
    } = fullUpdate;
    const retry = await admin.from("realtor_profiles").update(basicUpdate).eq("id", profile.id);
    updateError = retry.error;
  }

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  let slug = profile.slug;
  if (wantsPublish && !slug) {
    slug = await publishRealtorSlug(profile.id, body.display_name?.trim() || profile.display_name);
  }

  return NextResponse.json({ ok: true, slug });
}
