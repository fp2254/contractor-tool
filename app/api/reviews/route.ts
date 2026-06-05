import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST — public: homeowner submits a review for a contractor (looked up by slug)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, reviewer_name, rating, text, job_type, location } = body;

    if (!slug || !reviewer_name?.trim() || !text?.trim()) {
      return NextResponse.json({ error: "slug, reviewer_name, and text are required." }, { status: 400 });
    }
    const stars = Number(rating);
    if (!stars || stars < 1 || stars > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    }

    const admin = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pub } = await (admin as any)
      .from("public_profiles")
      .select("org_id")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!pub?.org_id) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).from("profile_reviews").insert({
      org_id: pub.org_id,
      reviewer_name: reviewer_name.trim(),
      rating: stars,
      text: text.trim(),
      job_type: job_type?.trim() || null,
      location: location?.trim() || null,
      verified: false,
      approved: false,
    });

    if (error) {
      console.error("[reviews] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reviews] unexpected error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// GET — auth: contractor sees all their reviews
export async function GET() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("profile_reviews")
    .select("id, reviewer_name, rating, text, job_type, location, verified, approved, created_at")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}
