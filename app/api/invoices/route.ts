import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import { z } from "zod";

const invoiceSchema = z.object({
  customer_id: z.string().optional().default(""),
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

  let { customer_id } = parsed.data;
  const { due_date, notes, items } = parsed.data;

  if (body.new_customer) {
    const nc = body.new_customer as {
      first_name: string;
      last_name?: string;
      phone?: string;
      email?: string;
    };
    const { data: newCust, error: custErr } = await admin
      .from("customers")
      .insert({
        org_id: orgId!,
        first_name: nc.first_name ?? "",
        last_name: nc.last_name || null,
        phone: nc.phone || null,
        email: nc.email || null,
        created_by_user: user?.id ?? null,
      })
      .select("id")
      .single();

    if (custErr || !newCust) {
      return NextResponse.json(
        { error: custErr?.message ?? "Could not create client" },
        { status: 400 }
      );
    }
    customer_id = newCust.id;
  }

  if (!customer_id) {
    return NextResponse.json({ error: "Please select or create a client." }, { status: 400 });
  }

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
      created_by_user: user?.id ?? null,
    } as Record<string, unknown>)
    .select("id")
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: error?.message ?? "Could not create invoice" }, { status: 400 });
  }

  const inserts: Promise<unknown>[] = [];

  if (items.length) {
    inserts.push(
      admin.from("invoice_items").insert(
        items.map((item) => ({
          org_id: orgId!,
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
        }))
      )
    );
  }

  // Save notes and warranty as rows in the notes table (invoices has no notes column)
  if (notes && notes.trim()) {
    inserts.push(
      admin.from("notes").insert({
        org_id: orgId!,
        entity_type: "invoice",
        entity_id: invoice.id,
        body: notes.trim(),
        created_by: user?.id ?? null,
      })
    );
  }

  await Promise.all(inserts);

  return NextResponse.json({ id: invoice.id });
}
