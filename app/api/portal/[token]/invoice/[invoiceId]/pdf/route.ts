import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { InvoicePDF } from "@/lib/pdf/InvoicePDF";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; invoiceId: string }> }
) {
  const { token, invoiceId } = await params;
  const admin = createAdminClient();

  const { data: pt } = await admin
    .from("customer_portal_tokens")
    .select("customer_id,org_id,expires_at")
    .eq("token", token)
    .single();

  if (!pt || new Date(pt.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  }

  const [{ data: invoice }, { data: items }, { data: org }, { data: settings }, { data: invoiceNotes }] = await Promise.all([
    admin.from("invoices").select("*").eq("id", invoiceId).eq("customer_id", pt.customer_id).eq("org_id", pt.org_id).single(),
    admin.from("invoice_items").select("*").eq("invoice_id", invoiceId).eq("org_id", pt.org_id),
    admin.from("orgs").select("*").eq("id", pt.org_id).single(),
    admin.from("org_settings").select("*").eq("org_id", pt.org_id).maybeSingle(),
    admin.from("notes").select("body").eq("entity_type", "invoice").eq("entity_id", invoiceId).eq("org_id", pt.org_id),
  ]);

  if (!invoice || !org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: customer } = await admin.from("customers").select("*").eq("id", pt.customer_id).single();
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Resolve the linked quote: direct link (quotes.invoice_id) OR via job
  const [linkedQuoteDirect, linkedJob] = await Promise.all([
    admin.from("quotes").select("id").eq("invoice_id", invoiceId).eq("org_id", pt.org_id).maybeSingle(),
    invoice.job_id
      ? admin.from("jobs").select("quote_id").eq("id", invoice.job_id).eq("org_id", pt.org_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const linkedQuoteId: string | null =
    (linkedQuoteDirect as { data: { id: string } | null }).data?.id ??
    (linkedJob as { data: { quote_id: string | null } | null }).data?.quote_id ??
    null;

  // Warranty: invoice note first, fall back to linked quote note
  const invoiceWarrantyNote = (invoiceNotes ?? []).find((n: { body: string }) => n.body.startsWith("__warranty__:"));
  let warrantyText: string | null = invoiceWarrantyNote
    ? invoiceWarrantyNote.body.replace("__warranty__:", "")
    : null;

  if (!warrantyText && linkedQuoteId) {
    const { data: quoteWarrantyNotes } = await admin
      .from("notes")
      .select("body")
      .eq("entity_type", "quote")
      .eq("entity_id", linkedQuoteId)
      .eq("org_id", pt.org_id)
      .like("body", "__warranty__%")
      .limit(1);
    const qw = (quoteWarrantyNotes ?? [])[0];
    if (qw) warrantyText = String(qw.body).replace("__warranty__:", "");
  }

  // Photos: invoice + job + quote (all paths)
  const photoSources = [
    admin.from("photos").select("url,filename").eq("entity_type", "invoice").eq("entity_id", invoiceId).eq("org_id", pt.org_id).order("created_at", { ascending: true }),
    invoice.job_id
      ? admin.from("photos").select("url,filename").eq("entity_type", "job").eq("entity_id", invoice.job_id).eq("org_id", pt.org_id).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { url: string; filename: string | null }[] }),
    linkedQuoteId
      ? admin.from("photos").select("url,filename").eq("entity_type", "quote").eq("entity_id", linkedQuoteId).eq("org_id", pt.org_id).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { url: string; filename: string | null }[] }),
  ];
  const photoResults = await Promise.all(photoSources);
  const photos = photoResults.flatMap(r => (r as { data: { url: string; filename: string | null }[] | null }).data ?? []);

  const buffer = await renderToBuffer(
    React.createElement(InvoicePDF, {
      invoice,
      items: items ?? [],
      customer,
      org,
      settings: settings as any,
      warrantyText,
      photos,
    })
  );

  const invoiceNum = invoice.invoice_number ?? `INV-${invoiceId.slice(0, 8).toUpperCase()}`;
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoiceNum}.pdf"`,
    },
  });
}
