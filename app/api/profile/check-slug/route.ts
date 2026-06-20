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

export async function GET(req: Request) {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("slug") ?? "";
  const slug = slugify(raw);

  if (!slug || slug.length < 3) {
    return NextResponse.json({ slug, available: false, reason: "too_short" });
  }

  const admin = createAdminClient();
  const { data: existing } = await (admin as any)
    .from("public_profiles")
    .select("org_id")
    .eq("slug", slug)
    .maybeSingle();

  const available = !existing || existing.org_id === orgId;
  return NextResponse.json({ slug, available, reason: available ? null : "taken" });
}
