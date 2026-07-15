import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    const orgId = await ensureUserOrg();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { source } = await req.json();
    if (source !== "external" && source !== "tradebase") {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }

    const admin = createAdminClient() as any;
    const { error } = await admin
      .from("org_settings")
      .update({ preferred_website_source: source })
      .eq("org_id", orgId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
