import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { QuotePDF } from "@/lib/pdf/QuotePDF";
import { getResendClient, quoteEmailHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const { checkDemoBlock } = await import("@/lib/demo");
  const demoBlock = await checkDemoBlock(orgId!, "Email sending");
  if (demoBlock) return demoBlock;

  const [{ data: quote }, { data: items }, { data: org }, { data: settings }, { data: quoteNotes }] = await Promise.all([
    admin.from("quotes").select("*").eq("id", id).eq("org_id", orgId!).single(),
    admin.from("quote_items").select("*").eq("quote_id", id).eq("org_id", orgId!),
    admin.from("orgs").select("*").eq("id", orgId!).single(),
    admin.from("org_settings").select("*").eq("org_id", orgId!).maybeSingle(),
    admin.from("notes").select("body").eq("entity_type", "quote").eq("entity_id", id).eq("org_id", orgId!).like("body", "__warranty__%"),
  ]);

  if (!quote || !org) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const quoteWarrantyNote = (quoteNotes ?? [])[0];
  const warrantyText: string | null = quoteWarrantyNote
    ? String(quoteWarrantyNote.body).replace("__warranty__:", "")
    : null;

  const { data: customer } = await admin
    .from("customers")
    .select("*")
    .eq("id", quote.customer_id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  if (!customer.email) {
    return NextResponse.json({ error: "Customer has no email address on file" }, { status: 400 });
  }

  const buffer = await renderToBuffer(
    React.createElement(QuotePDF, {
      quote,
      items: items ?? [],
      customer,
      org,
      settings: settings as any,
      warrantyText,
    })
  );

  const quoteNum = `Q-${id.slice(0, 8).toUpperCase()}`;
  const businessName = org.business_name ?? "Your Contractor";
  const customerFirstName = customer.first_name || customer.company_name || "there";

  const { client, fromEmail } = await getResendClient();

  const { error: sendError } = await client.emails.send({
    from: `${businessName} <${fromEmail}>`,
    to: [customer.email],
    subject: `Your Estimate from ${businessName}`,
    html: quoteEmailHtml({
      businessName,
      customerFirstName,
      quoteNum,
      total: Number(quote.total_amount),
      lineItems: (items ?? []).map(i => ({
        description: i.description,
        quantity: Number(i.quantity),
        total_price: Number(i.total_price),
      })),
      notes: quote.notes,
      warrantyText,
    }),
    attachments: [
      {
        filename: `${quoteNum}.pdf`,
        content: buffer.toString("base64"),
      },
    ],
  });

  if (sendError) {
    console.error("Resend error:", sendError);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  await admin
    .from("quotes")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", orgId!);

  return NextResponse.json({ success: true, to: customer.email });
}
