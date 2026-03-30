import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { lookupLinkedOrg } from "@/lib/trade-contacts-link";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const body = await req.json() as {
    archived?: boolean;
    name?: string;
    company?: string;
    trade?: string;
    phone?: string;
    email?: string;
    notes?: string;
  };

  const updates: Record<string, unknown> = {};
  if (body.archived !== undefined) updates.archived = body.archived;
  if (body.name !== undefined) updates.name = body.name;
  if (body.company !== undefined) updates.company = body.company;
  if (body.trade !== undefined) updates.trade = body.trade;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.notes !== undefined) updates.notes = body.notes;

  // If email is changing, re-run the profile link lookup
  if (body.email !== undefined) {
    updates.email = body.email;
    updates.linked_org_id = body.email?.trim()
      ? await lookupLinkedOrg(body.email.trim())
      : null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("trade_contacts")
    .update(updates)
    .eq("id", id)
    .eq("org_id", orgId!)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("trade_contacts")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId!);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
