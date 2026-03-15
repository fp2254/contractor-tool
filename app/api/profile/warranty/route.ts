import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const { default_warranty_text } = await req.json() as { default_warranty_text?: string };

  const { error } = await admin
    .from("org_settings")
    .upsert(
      { org_id: orgId!, default_warranty_text: default_warranty_text ?? null },
      { onConflict: "org_id" }
    );

  if (error) {
    console.error("[warranty] org_settings upsert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidatePath("/app/profile");
  return NextResponse.json({ success: true });
}
