import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { quoteSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const orgId = await ensureUserOrg();
  const body = await req.json();
  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id ?? null;

  const parsed = quoteSchema.parse(body);

  let customerId = parsed.customer_id;

  if (body.new_customer) {
    const nc = body.new_customer as {
      first_name: string;
      last_name?: string;
      phone?: string;
      email?: string;
    };

    // Deduplicate: reuse existing customer if phone or email already on file for this org.
    let existingId: string | null = null;
    if (nc.phone || nc.email) {
      const orClauses: string[] = [];
      if (nc.phone) orClauses.push(`phone.eq.${nc.phone}`);
      if (nc.email) orClauses.push(`email.eq.${nc.email}`);
      const { data: existing } = await admin
        .from("customers")
        .select("id")
        .eq("org_id", orgId!)
        .or(orClauses.join(","))
        .limit(1)
        .maybeSingle();
      existingId = existing?.id ?? null;
    }

    if (existingId) {
      customerId = existingId;
    } else {
      const { data: newCust, error: custErr } = await admin
        .from("customers")
        .insert({
          org_id: orgId!,
          first_name: nc.first_name ?? "",
          last_name: nc.last_name ?? "",
          phone: nc.phone ?? "",
          email: nc.email ?? "",
          created_by_user: userId,
        })
        .select("id")
        .single();

      if (custErr || !newCust) {
        return NextResponse.json(
          { error: custErr?.message ?? "Could not create customer" },
          { status: 400 }
        );
      }

      customerId = newCust.id;
    }
  }

  const totalAmount = parsed.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  const { data: quote, error } = await admin
    .from("quotes")
    .insert({
      org_id: orgId!,
      customer_id: customerId,
      status: "draft",
      total_amount: totalAmount,
      notes: parsed.notes ?? "",
      created_by_user: userId,
      ...(parsed.scope_items?.length ? { scope_items: parsed.scope_items.join("\n") } : {}),
      ...(parsed.estimated_time ? { estimated_time: parsed.estimated_time } : {}),
    } as Record<string, unknown>)
    .select("id")
    .single();

  if (error || !quote) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create quote" },
      { status: 400 }
    );
  }

  const insertOps: Promise<unknown>[] = [
    admin.from("quote_items").insert(
      parsed.items.map((item) => ({
        org_id: orgId!,
        quote_id: quote.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
      }))
    ),
  ];

  // Save warranty as a separate notes-table entry (never mixed into quotes.notes)
  const warrantyText = (body.warranty as string | undefined)?.trim();
  if (warrantyText) {
    insertOps.push(
      admin.from("notes").insert({
        org_id: orgId!,
        entity_type: "quote",
        entity_id: quote.id,
        body: `__warranty__:${warrantyText}`,
        created_by: userId,
      })
    );
  }

  await Promise.all(insertOps);

  return NextResponse.json({ id: quote.id });
}
