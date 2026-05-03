import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

type LineItemInput = {
  description: string;
  quantity: number;
  unit_price: number;
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const body = await req.json() as {
    status?: string;
    unarchive?: boolean;
    notes?: string;
    items?: LineItemInput[];
  };

  // Archive: write a note flag instead of touching the enum status column
  if (body.status === "archived") {
    await admin.from("notes").delete()
      .eq("org_id", orgId!)
      .eq("entity_type", "quote")
      .eq("entity_id", id)
      .eq("body", "__archived__");
    const { error } = await admin.from("notes").insert({
      org_id: orgId!,
      entity_type: "quote",
      entity_id: id,
      body: "__archived__",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // Unarchive: delete the note flag, restore to draft
  if (body.status === "draft" || body.unarchive) {
    await admin.from("notes").delete()
      .eq("org_id", orgId!)
      .eq("entity_type", "quote")
      .eq("entity_id", id)
      .eq("body", "__archived__");
    // Also set status back to draft in the quotes table
    await admin.from("quotes").update({ status: "draft" }).eq("id", id).eq("org_id", orgId!);
    return NextResponse.json({ ok: true });
  }

  const patch: Record<string, unknown> = {};
  if (body.status !== undefined) patch.status = body.status;
  if (body.notes !== undefined) patch.notes = body.notes;

  // If line items are being replaced, recalculate total and swap out items
  if (body.items !== undefined) {
    const total = body.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    patch.total_amount = total;

    await admin.from("quote_items").delete().eq("quote_id", id).eq("org_id", orgId!);
    if (body.items.length > 0) {
      const rows = body.items
        .filter(i => i.description.trim())
        .map(i => ({
          org_id: orgId!,
          quote_id: id,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.quantity * i.unit_price,
        }));
      if (rows.length > 0) await admin.from("quote_items").insert(rows);
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await admin
    .from("quotes")
    .update(patch)
    .eq("id", id)
    .eq("org_id", orgId!);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  await admin.from("notes").delete().eq("entity_type", "quote").eq("entity_id", id);
  await admin.from("quote_items").delete().eq("quote_id", id);
  const { error } = await admin
    .from("quotes")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId!);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
