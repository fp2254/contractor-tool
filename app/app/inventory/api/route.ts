import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const body = await req.json() as {
    name: string;
    sku?: string;
    description?: string;
    quantity?: number;
    unit_cost?: number;
    category?: string;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("inventory_items")
    .insert({
      org_id: orgId!,
      name: body.name.trim(),
      sku: body.sku?.trim() || null,
      description: body.description?.trim() || null,
      quantity: body.quantity ?? 0,
      unit_cost: body.unit_cost ?? 0,
      category: body.category?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
