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
    const [{ data: profile }, { data: org }, { data: settings }] = await Promise.all([
      (admin as any)
        .from("public_profiles")
        .select("*")
        .eq("org_id", orgId!)
        .maybeSingle(),
      admin.from("orgs").select("name").eq("id", orgId!).single(),
      admin.from("org_settings").select("*").eq("org_id", orgId!).maybeSingle(),
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

  // Build the row: only include fields that were explicitly provided in the
  // request body so a partial save (e.g. from the setup wizard) never
  // overwrites fields managed by the full profile editor.
  const row: Record<string, unknown> = {
    org_id: orgId!,
    slug,
    updated_at: new Date().toISOString(),
  };

  if (body.trade !== undefined)            row.trade            = body.trade ?? "";
  if (body.tagline !== undefined)          row.tagline          = body.tagline ?? "";
  if (body.phone !== undefined)            row.phone            = body.phone ?? "";
  if (body.service_area !== undefined)     row.service_area     = body.service_area ?? "";
  if (body.urgency_line !== undefined)     row.urgency_line     = body.urgency_line ?? "";
  if (body.selected_template !== undefined) row.selected_template = body.selected_template ?? "";
  if (body.years_experience !== undefined) row.years_experience = Number(body.years_experience) || 0;
  if (body.revenue_display !== undefined)  row.revenue_display  = body.revenue_display ?? "";
  if (body.stat_label !== undefined)       row.stat_label       = body.stat_label ?? "";
  if (body.license_text !== undefined)     row.license_text     = body.license_text ?? "";
  if (body.photo_url !== undefined)        row.photo_url        = body.photo_url ?? "";
  if (body.photos !== undefined)           row.photos           = body.photos ?? [];
  if (body.is_published !== undefined)     row.is_published     = !!body.is_published;
  if (body.about_text !== undefined) {
    row.about_bullets = String(body.about_text).split("\n").map((s) => s.trim()).filter(Boolean);
  } else if (body.about_bullets !== undefined) {
    row.about_bullets = body.about_bullets ?? [];
  }
  if (body.services !== undefined)         row.services         = body.services ?? [];

  // Attempt the full upsert. If optional new columns don't exist yet, retry
  // without them so the save never fails while the DB migration is pending.
  const optionalCols = ["stat_label", "selected_template", "photos"] as const;

  async function tryUpsert(r: Record<string, unknown>) {
    const { data, error } = await (admin as any)
      .from("public_profiles")
      .upsert(r, { onConflict: "org_id" })
      .select()
      .single();
    return { data, error };
  }

  try {
    let { data, error } = await tryUpsert(row);

    // If a column doesn't exist yet, strip optional cols one-by-one and retry.
    if (error && (error.code === "PGRST204" || error.code === "42703" || error.message?.includes("column"))) {
      const stripped = { ...row };
      for (const col of optionalCols) {
        delete stripped[col];
      }
      ({ data, error } = await tryUpsert(stripped));
    }

    if (error) throw error;

    return NextResponse.json({ profile: data });
  } catch (err: any) {
    console.error("[public-profile] save error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to save profile." },
      { status: 500 }
    );
  }
}
