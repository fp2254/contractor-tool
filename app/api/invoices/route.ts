import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import { z } from "zod";

const invoiceSchema = z.object({
  customer_id: z.string().min(1),
  due_date: z.string().optional().nullable(),
  notes: z.string().optional().default(""),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unit_price: z.number().min(0),
  })).min(1),
});

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await req.json();
  const parsed = invoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { customer_id, due_date, notes, items } = parsed.data;
  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  const { data: invoice, error } = await admin
    .from("invoices")
    .insert({
      org_id: orgId!,
      customer_id,
      status: "unpaid",
      total_amount: totalAmount,
      invoice_number: `INV-${Date.now()}`,
      due_date: due_date ?? null,
      notes: notes ?? "",
      created_by_user: user?.id ?? null,
    } as Record<string, unknown>)
    .select("id")
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: error?.message ?? "Could not create invoice" }, { status: 400 });
  }

  if (items.length) {
    await admin.from("invoice_items").insert(
      items.map((item) => ({
        org_id: orgId!,
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
      }))
    );
  }

  return NextResponse.json({ id: invoice.id });
}
