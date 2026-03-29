import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export async function GET() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  try {
    const { data } = await (admin as any)
      .from("public_profiles")
      .select("*")
      .eq("org_id", orgId!)
      .maybeSingle();
    return NextResponse.json({ profile: data ?? null });
  } catch {
    return NextResponse.json({ profile: null });
  }
}

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const body = await req.json();

  // Auto-generate slug from org name if not provided
  let slug = (body.slug ?? "").trim();
  if (!slug) {
    const { data: org } = await admin.from("orgs").select("name").eq("id", orgId!).single();
    const base = slugify(`${org?.name ?? "contractor"} ${body.trade ?? ""}`);
    slug = base || "my-profile";
  } else {
    slug = slugify(slug);
  }

  // Check slug uniqueness (excluding current org)
  try {
    const { data: existing } = await (admin as any)
      .from("public_profiles")
      .select("org_id")
      .eq("slug", slug)
      .neq("org_id", orgId!)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "That URL slug is already taken. Try a different one." }, { status: 409 });
    }
  } catch { /* table may not exist — let upsert fail naturally */ }

  const row = {
    org_id: orgId!,
    slug,
    trade: body.trade ?? "",
    tagline: body.tagline ?? "",
    phone: body.phone ?? "",
    service_area: body.service_area ?? "",
    urgency_line: body.urgency_line ?? "",
    years_experience: Number(body.years_experience) || 0,
    revenue_display: body.revenue_display ?? "",
    services: body.services ?? [],
    about_bullets: body.about_bullets ?? [],
    license_text: body.license_text ?? "",
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await (admin as any)
      .from("public_profiles")
      .upsert(row, { onConflict: "org_id" })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ profile: data });
  } catch (err: any) {
    console.error("[public-profile] save error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to save. Run scripts/public-profiles-setup.sql in Supabase Studio first." },
      { status: 500 }
    );
  }
}
