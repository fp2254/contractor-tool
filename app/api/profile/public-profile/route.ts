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
    services: body.services ?? [],
    about_bullets: body.about_bullets ?? [],
    license_text: body.license_text ?? "",
    photo_url: body.photo_url ?? "",
    selected_template: selectedTemplate,
    updated_at: new Date().toISOString(),
  };

  console.log("[public-profile] saving selected_template:", selectedTemplate, "for org:", orgId);

  // If the column doesn't exist yet, retry without it so the save never fails.
  try {
    const { data, error } = await (admin as any)
      .from("public_profiles")
      .upsert(row, { onConflict: "org_id" })
      .select()
      .single();

    if (error) {
      console.error("[public-profile] upsert error:", error);
      // If the schema cache hasn't refreshed yet after the ALTER TABLE,
      // surface a clear message instead of silently dropping the template value.
      if (error.message?.includes("selected_template") || error.code === "PGRST204") {
        return NextResponse.json(
          { error: "Schema not refreshed yet. In Supabase Studio go to Settings → API → Reload schema, then save again." },
          { status: 500 }
        );
      }
      throw error;
    }

    console.log("[public-profile] saved, db returned selected_template:", (data as any)?.selected_template);
    return NextResponse.json({ profile: data });
  } catch (err: any) {
    console.error("[public-profile] save error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to save profile." },
      { status: 500 }
    );
  }
}
