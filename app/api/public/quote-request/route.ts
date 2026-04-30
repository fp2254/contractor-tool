import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      slug: string;
      name: string;
      phone: string;
      description: string;
    };

    const { slug, name, phone, description } = body;

    if (!slug || !name?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Look up the org from the public profile slug
    const { data: pub } = await (admin as any)
      .from("public_profiles")
      .select("org_id")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!pub?.org_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Insert lead
    const { error } = await admin.from("leads").insert({
      org_id: pub.org_id,
      name: name.trim(),
      phone: phone?.trim() || null,
      notes: description?.trim() || null,
      lead_source: "Website",
      status: "new",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
