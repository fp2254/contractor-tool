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
    const [{ data: profile }, { data: org }, { data: settings }, { count: websiteLeadsCount }] = await Promise.all([
      (admin as any)
        .from("public_profiles")
        .select("*")
        .eq("org_id", orgId!)
        .maybeSingle(),
      admin.from("orgs").select("name").eq("id", orgId!).single(),
      admin.from("org_settings").select("*").eq("org_id", orgId!).maybeSingle(),
      admin.from("leads")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId!)
        .eq("lead_source", "Website"),
    ]);

    return NextResponse.json({
      profile: profile ?? null,
      orgName: org?.name ?? "",
      businessName: (settings as any)?.business_name ?? "",
      primaryPhone: (settings as any)?.primary_phone ?? "",
      address: (settings as any)?.address ?? "",
      city: (settings as any)?.city ?? "",
      state: (settings as any)?.state ?? "",
      zip: (settings as any)?.zip ?? "",
      website_leads_count: websiteLeadsCount ?? 0,
    });
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

  const row: Record<string, unknown> = {
    org_id: orgId!,
    slug,
    updated_at: new Date().toISOString(),
  };

  if (body.trade !== undefined)              row.trade              = body.trade ?? "";
  if (body.tagline !== undefined)            row.tagline            = body.tagline ?? "";
  if (body.phone !== undefined)              row.phone              = body.phone ?? "";
  if (body.service_area !== undefined)       row.service_area       = body.service_area ?? "";
  if (body.urgency_line !== undefined)       row.urgency_line       = body.urgency_line ?? "";
  if (body.selected_template !== undefined)  row.selected_template  = body.selected_template ?? "";
  if (body.years_experience !== undefined)   row.years_experience   = Number(body.years_experience) || 0;
  if (body.revenue_display !== undefined)    row.revenue_display    = body.revenue_display ?? "";
  if (body.stat_label !== undefined)         row.stat_label         = body.stat_label ?? "";
  if (body.license_text !== undefined)       row.license_text       = body.license_text ?? "";
  if (body.photo_url !== undefined)          row.photo_url          = body.photo_url ?? "";
  if (body.about_photo !== undefined)        row.about_photo        = body.about_photo ?? "";
  if (body.photos !== undefined)             row.photos             = body.photos ?? [];
  if (body.is_published !== undefined)       row.is_published       = !!body.is_published;
  if (body.trust_highlights !== undefined)   row.trust_highlights   = body.trust_highlights ?? [];
  if (body.sections_config !== undefined)    row.sections_config    = body.sections_config ?? {};
  if (body.custom_blocks !== undefined)      row.custom_blocks      = body.custom_blocks ?? [];
  if (body.about_text !== undefined) {
    row.about_bullets = String(body.about_text).split("\n").map((s) => s.trim()).filter(Boolean);
  } else if (body.about_bullets !== undefined) {
    row.about_bullets = body.about_bullets ?? [];
  }
  if (body.services !== undefined)           row.services           = body.services ?? [];

  async function attemptUpsert(r: Record<string, unknown>) {
    return (admin as any)
      .from("public_profiles")
      .upsert(r, { onConflict: "org_id" })
      .select()
      .single();
  }

  try {
    let { data, error } = await attemptUpsert(row);

    // If a column doesn't exist yet (pending migration), retry without that column
    if (error?.code === "PGRST204" || error?.code === "42703") {
      const missing = (error.message?.match(/'(\w+)'\s+column\s+of/) ?? error.message?.match(/column\s+'(\w+)'\s+of/))?.[1];
      if (missing && missing in row) {
        const trimmed = { ...row };
        delete trimmed[missing];
        ({ data, error } = await attemptUpsert(trimmed));
      }
    }

    if (error) throw error;
    return NextResponse.json({ profile: data });
  } catch (err: any) {
    console.error("[public-profile] save error:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to save profile." }, { status: 500 });
  }
}
