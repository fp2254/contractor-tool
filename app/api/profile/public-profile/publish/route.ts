import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { is_published } = await req.json() as { is_published: boolean };

  try {
    const { data, error } = await (admin as any)
      .from("public_profiles")
      .update({ is_published, updated_at: new Date().toISOString() })
      .eq("org_id", orgId!)
      .select("is_published, slug")
      .single();
    if (error) throw error;
    return NextResponse.json({ is_published: data.is_published, slug: data.slug });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to update. Make sure you've saved the profile first." },
      { status: 500 }
    );
  }
}
