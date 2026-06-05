import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getOrgId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
  return data?.org_id ?? null;
}

export async function GET() {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any).from("public_profiles").select("*").eq("org_id", orgId).maybeSingle();
  return NextResponse.json({ profile: data ?? null });
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    slug, is_published, trade, tagline, phone, service_area, urgency_line,
    years_experience, revenue_display, services, about_bullets, license_text,
    photo_url, selected_template, stat_label,
  } = body;

  if (!slug?.trim()) return NextResponse.json({ error: "Slug is required." }, { status: 400 });

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const admin = createAdminClient();

  // Check slug uniqueness (allow own slug)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from("public_profiles")
    .select("org_id")
    .eq("slug", cleanSlug)
    .maybeSingle();

  if (existing && existing.org_id !== orgId) {
    return NextResponse.json({ error: "That URL is already taken. Please choose a different one." }, { status: 409 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any).from("public_profiles").upsert({
    org_id: orgId,
    slug: cleanSlug,
    is_published: is_published ?? false,
    trade: trade ?? "",
    tagline: tagline ?? "",
    phone: phone ?? "",
    service_area: service_area ?? "",
    urgency_line: urgency_line ?? "",
    years_experience: years_experience ?? 0,
    revenue_display: revenue_display ?? "",
    services: services ?? [],
    about_bullets: about_bullets ?? [],
    license_text: license_text ?? "",
    photo_url: photo_url ?? "",
    selected_template: selected_template ?? "",
    stat_label: stat_label ?? "",
    updated_at: new Date().toISOString(),
  }, { onConflict: "org_id" }).select("*").single();

  if (error) {
    console.error("[profile] upsert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
