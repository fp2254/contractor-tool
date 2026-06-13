import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const orgId = await ensureUserOrg();
    const body = await req.json() as { name: string; phone?: string; description?: string };
    const { name, phone, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: lead, error } = await admin.from("leads").insert({
      org_id: orgId,
      name: name.trim(),
      phone: phone?.trim() || null,
      notes: description?.trim()
        ? `[Test Lead — from Setup Wizard]\n\n${description.trim()}`
        : "[Test Lead — from Setup Wizard]",
      lead_source: "Website",
      status: "new",
    }).select("id").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, lead_id: lead?.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
