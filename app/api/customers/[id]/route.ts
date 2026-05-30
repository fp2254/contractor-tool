import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const body = await req.json() as {
    first_name?: string;
    last_name?: string;
    phone?: string;
    address_line1?: string;
    city?: string;
    state?: string;
    zip?: string;
  };

  const allowed = ["first_name", "last_name", "phone", "address_line1", "city", "state", "zip"];
  const update: Record<string, string | null> = {};
  for (const key of allowed) {
    if (key in body) {
      const val = (body as Record<string, string | undefined>)[key];
      update[key] = val?.trim() || null;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await admin
    .from("customers")
    .update(update)
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
