import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { InvoicePDF } from "@/lib/pdf/InvoicePDF";
import { getResendClient, invoiceEmailHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const { checkDemoBlock } = await import("@/lib/demo");
  const demoBlock = await checkDemoBlock(orgId!, "Email sending");
  if (demoBlock) return demoBlock;

  const [{ data: invoice }, { data: items }, { data: org }, { data: settings }] = await Promise.all([
    admin.from("invoices").select("*").eq("id", id).eq("org_id", orgId!).single(),
    admin.from("invoice_items").select("*").eq("invoice_id", id).eq("org_id", orgId!),
    admin.from("orgs").select("*").eq("id", orgId!).single(),
    admin.from("org_settings").select("*").eq("org_id", orgId!).maybeSingle(),
  ]);

  if (!invoice || !org) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const { data: customer } = await admin
    .from("customers")
    .select("*")
    .eq("id", invoice.customer_id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  if (!customer.email) {
    return NextResponse.json({ error: "Customer has no email address on file" }, { status: 400 });
  }

  const buffer = await renderToBuffer(
    React.createElement(InvoicePDF, {
      invoice,
      items: items ?? [],
      customer,
      org,
      settings: settings as any,
    })
  );

  const invoiceNum = invoice.invoice_number ?? `INV-${id.slice(0, 8).toUpperCase()}`;
  const businessName = org.business_name ?? "Your Contractor";
  const customerFirstName = customer.first_name || customer.company_name || "there";

  const { client, fromEmail } = await getResendClient();

  const paymentMethods = (settings as any)?.payment_methods ?? null;

  const { error: sendError } = await client.emails.send({
    from: `${businessName} <${fromEmail}>`,
    to: [customer.email],
    subject: `Invoice ${invoiceNum} from ${businessName}`,
    html: invoiceEmailHtml({
      businessName,
      customerFirstName,
      invoiceNum,
      total: Number(invoice.total_amount),
      dueDate: invoice.due_date ?? null,
      lineItems: (items ?? []).map(i => ({
        description: i.description,
        quantity: Number(i.quantity),
        total_price: Number(i.total_price),
      })),
      paymentMethods,
    }),
    attachments: [
      {
        filename: `${invoiceNum}.pdf`,
        content: buffer.toString("base64"),
      },
    ],
  });

  if (sendError) {
    console.error("Resend error:", sendError);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ success: true, to: customer.email });
}
