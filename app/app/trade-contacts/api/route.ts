import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { lookupLinkedOrg } from "@/lib/trade-contacts-link";

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const body = await req.json() as {
    name: string;
    company?: string;
    trade?: string;
    phone?: string;
    email?: string;
    notes?: string;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Attempt to link to a TradeBase profile by email (best-effort, never blocks save)
  let linkedOrgId: string | null = null;
  if (body.email?.trim()) {
    linkedOrgId = await lookupLinkedOrg(body.email.trim());
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("trade_contacts")
    .insert({
      org_id: orgId!,
      name: body.name.trim(),
      company: body.company?.trim() || null,
      trade: body.trade?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      notes: body.notes?.trim() || null,
      linked_org_id: linkedOrgId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
