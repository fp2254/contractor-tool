import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();

  try {
    const { data: pub } = await (admin as any)
      .from("public_profiles")
      .select("org_id")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!pub) return NextResponse.json({ reviews: [], rating: 0, reviewCount: 0 });

    const { data: rows } = await (admin as any)
      .from("profile_reviews")
      .select("id, reviewer_name, rating, text, job_type, location, verified, created_at")
      .eq("org_id", pub.org_id)
      .eq("approved", true)
      .order("created_at", { ascending: false });

    const reviews = rows ?? [];
    const rating = reviews.length > 0
      ? Math.round((reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

    return NextResponse.json({ reviews, rating, reviewCount: reviews.length });
  } catch {
    return NextResponse.json({ reviews: [], rating: 0, reviewCount: 0 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();

  const body = await req.json() as {
    reviewer_name?: string;
    reviewer_email?: string;
    stars?: number;
    comment?: string;
    job_type?: string;
    location?: string;
  };

  const name = body.reviewer_name?.trim() ?? "";
  const email = body.reviewer_email?.trim().toLowerCase() ?? "";
  const rating = Number(body.stars);
  const reviewText = body.comment?.trim() ?? "";

  if (!name || !email || !rating || !reviewText) {
    return NextResponse.json({ error: "Name, email, rating, and review are required." }, { status: 400 });
  }
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return NextResponse.json({ error: "Rating must be 1–5." }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    const { data: pub } = await (admin as any)
      .from("public_profiles")
      .select("org_id")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!pub) return NextResponse.json({ error: "Contractor profile not found." }, { status: 404 });

    const { error } = await (admin as any)
      .from("profile_reviews")
      .insert({
        org_id: pub.org_id,
        reviewer_name: name,
        reviewer_email: email,
        rating,
        text: reviewText,
        job_type: body.job_type?.trim() || null,
        location: body.location?.trim() || null,
        verified: false,
        approved: false,
      });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "You've already submitted a review for this contractor." }, { status: 409 });
      }
      console.error("[reviews] insert error:", error.message);
      return NextResponse.json(
        { error: "Could not save review. Run scripts/profile-reviews-setup.sql in Supabase Studio first." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[reviews] error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
