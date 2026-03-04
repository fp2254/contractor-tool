import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const lineItemSchema = z.object({
  description: z.string(),
  qty: z.number(),
  unit_price: z.number(),
  preset_id: z.string().nullable().optional(),
  unit: z.string().optional(),
});

const bodySchema = z.object({
  type: z.enum(["quote", "job", "invoice"]),
  customer: z.object({
    name: z.string(),
    phone: z.string(),
    email: z.string(),
    address: z.string(),
  }),
  job: z.object({
    title: z.string(),
    scheduled_date: z.string().nullable(),
    time_window: z.string().nullable().optional(),
    notes: z.string(),
  }),
  quote: z.object({
    line_items: z.array(lineItemSchema),
    notes: z.string(),
  }),
});

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  const body = bodySchema.parse(await req.json());

  // Split name into first/last
  const nameParts = body.customer.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  // Create customer
  const { data: customer, error: custErr } = await admin
    .from("customers")
    .insert({
      org_id: orgId!,
      first_name: firstName,
      last_name: lastName,
      phone: body.customer.phone || null,
      email: body.customer.email || null,
      address_line1: body.customer.address || null,
      created_by_user: userId,
    })
    .select("id")
    .single();

  if (custErr || !customer) {
    return NextResponse.json(
      { error: "Could not create customer" },
      { status: 500 }
    );
  }

  const total = body.quote.line_items.reduce(
    (sum, i) => sum + i.qty * i.unit_price,
    0
  );

  if (body.type === "quote") {
    const { data: quote, error } = await admin
      .from("quotes")
      .insert({
        org_id: orgId!,
        customer_id: customer.id,
        status: "draft",
        total_amount: total,
        notes: body.job.notes || body.quote.notes || null,
        created_by_user: userId,
      })
      .select("id")
      .single();

    if (error || !quote) {
      return NextResponse.json(
        { error: "Could not create quote" },
        { status: 500 }
      );
    }

    await admin.from("quote_items").insert(
      body.quote.line_items.map((i) => ({
        org_id: orgId!,
        quote_id: quote.id,
        description: i.description,
        quantity: i.qty,
        unit_price: i.unit_price,
        total_price: i.qty * i.unit_price,
        ...(i.preset_id ? { preset_id: i.preset_id } : {}),
      }))
    );

    return NextResponse.json({ type: "quote", id: quote.id });
  }

  if (body.type === "job") {
    const scheduleDate = body.job.scheduled_date || null;
    const { data: job, error } = await admin
      .from("jobs")
      .insert({
        org_id: orgId!,
        customer_id: customer.id,
        job_title: body.job.title,
        status: "scheduled",
        address: body.customer.address || null,
        scheduled_date: scheduleDate,
        created_by_user: userId,
      })
      .select("id")
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: "Could not create job" },
        { status: 500 }
      );
    }

    const noteLines = [
      body.job.notes,
      body.job.time_window ? `Time window: ${body.job.time_window}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (noteLines) {
      await admin.from("notes").insert({
        org_id: orgId!,
        entity_type: "job",
        entity_id: job.id,
        body: noteLines,
        created_by: userId,
      });
    }

    return NextResponse.json({ type: "job", id: job.id });
  }

  if (body.type === "invoice") {
    const { data: org } = await admin
      .from("orgs")
      .select("default_payment_terms_days")
      .eq("id", orgId!)
      .single();

    const dueDate = new Date();
    dueDate.setDate(
      dueDate.getDate() + (org?.default_payment_terms_days ?? 14)
    );

    const { data: invoice, error } = await admin
      .from("invoices")
      .insert({
        org_id: orgId!,
        customer_id: customer.id,
        status: "unpaid",
        total_amount: total,
        invoice_number: `INV-${Date.now()}`,
        due_date: dueDate.toISOString(),
        created_by_user: userId,
      })
      .select("id")
      .single();

    if (error || !invoice) {
      return NextResponse.json(
        { error: "Could not create invoice" },
        { status: 500 }
      );
    }

    await admin.from("invoice_items").insert(
      body.quote.line_items.map((i) => ({
        org_id: orgId!,
        invoice_id: invoice.id,
        description: i.description,
        quantity: i.qty,
        unit_price: i.unit_price,
        total_price: i.qty * i.unit_price,
        ...(i.preset_id ? { preset_id: i.preset_id } : {}),
      }))
    );

    return NextResponse.json({ type: "invoice", id: invoice.id });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
