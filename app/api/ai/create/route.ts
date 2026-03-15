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
  existing_customer_id: z.string().nullable().optional(),
  warranty_text: z.string().nullable().optional(),
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
  try {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  const rawBody = await req.json();
  console.log("[create] incoming type:", rawBody?.type, "existing_customer_id:", rawBody?.existing_customer_id, "line_items:", rawBody?.quote?.line_items?.length);
  const body = bodySchema.parse(rawBody);

  // Use existing customer or create new one
  let customerId: string;

  if (body.existing_customer_id) {
    // Verify the customer belongs to this org
    const { data: existing } = await admin
      .from("customers")
      .select("id")
      .eq("id", body.existing_customer_id)
      .eq("org_id", orgId!)
      .single();
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    customerId = existing.id;
  } else {
    const nameParts = body.customer.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ");

    const { data: newCustomer, error: custErr } = await admin
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

    if (custErr || !newCustomer) {
      console.error("[create] customer insert error:", custErr?.message, custErr?.details);
      return NextResponse.json({ error: "Could not create customer" }, { status: 500 });
    }
    customerId = newCustomer.id;
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
        customer_id: customerId,
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

    const lineItemRows = body.quote.line_items
      .filter((i) => i.description.trim())
      .map((i) => ({
        org_id: orgId!,
        quote_id: quote.id,
        description: i.description,
        quantity: i.qty,
        unit_price: i.unit_price,
        total_price: i.qty * i.unit_price,
        ...(i.preset_id ? { preset_id: i.preset_id } : {}),
      }));

    if (lineItemRows.length > 0) {
      await admin.from("quote_items").insert(lineItemRows);
    }

    return NextResponse.json({ type: "quote", id: quote.id });
  }

  if (body.type === "job") {
    const scheduleDate = body.job.scheduled_date || null;
    const { data: job, error } = await admin
      .from("jobs")
      .insert({
        org_id: orgId!,
        customer_id: customerId,
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
      dueDate.getDate() + (Number(org?.default_payment_terms_days) || 14)
    );
    const dueDateStr = dueDate.toISOString().split("T")[0]; // plain date "YYYY-MM-DD"

    const invoiceNotes = body.job.notes || body.quote.notes || null;

    const { data: invoice, error } = await admin
      .from("invoices")
      .insert({
        org_id: orgId!,
        customer_id: customerId,
        status: "unpaid",
        total_amount: total,
        invoice_number: `INV-${Date.now()}`,
        due_date: dueDateStr,
        created_by_user: userId,
      } as Record<string, unknown>)
      .select("id")
      .single();

    if (error || !invoice) {
      console.error("[create] invoice insert error:", error?.message, error?.details, error?.hint);
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

    // Store job notes as a note on the invoice
    if (invoiceNotes) {
      await admin.from("notes").insert({
        org_id: orgId!,
        entity_type: "invoice",
        entity_id: invoice.id,
        body: invoiceNotes,
        created_by: userId,
      });
    }

    // Store warranty as a special note so the invoice page's warranty section picks it up
    const warrantyText = body.warranty_text;
    if (warrantyText) {
      await admin.from("notes").insert({
        org_id: orgId!,
        entity_type: "invoice",
        entity_id: invoice.id,
        body: `__warranty__:${warrantyText}`,
        created_by: userId,
      });
    }

    return NextResponse.json({ type: "invoice", id: invoice.id });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e) {
    console.error("[create] unhandled error:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Server error — please try again" }, { status: 500 });
  }
}
