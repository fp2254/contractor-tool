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

  const selectedTemplate = body.selected_template ?? "";

  const row: Record<string, unknown> = {
    org_id: orgId!,
    slug,
    trade: body.trade ?? "",
    tagline: body.tagline ?? "",
    phone: body.phone ?? "",
    service_area: body.service_area ?? "",
    urgency_line: body.urgency_line ?? "",
    years_experience: Number(body.years_experience) || 0,
    revenue_display: body.revenue_display ?? "",
    stat_label: body.stat_label ?? "",
    services: body.services ?? [],
    about_bullets: body.about_text
      ? String(body.about_text).split("\n").map((s) => s.trim()).filter(Boolean)
      : body.about_bullets ?? [],
    license_text: body.license_text ?? "",
    photo_url: body.photo_url ?? "",
    photos: body.photos ?? [],
    selected_template: selectedTemplate,
    updated_at: new Date().toISOString(),
  };

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
