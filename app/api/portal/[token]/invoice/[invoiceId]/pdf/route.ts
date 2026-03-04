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

  const [{ data: invoice }, { data: items }, { data: org }, { data: settings }] = await Promise.all([
    admin.from("invoices").select("*").eq("id", invoiceId).eq("customer_id", pt.customer_id).eq("org_id", pt.org_id).single(),
    admin.from("invoice_items").select("*").eq("invoice_id", invoiceId).eq("org_id", pt.org_id),
    admin.from("orgs").select("*").eq("id", pt.org_id).single(),
    admin.from("org_settings").select("*").eq("org_id", pt.org_id).maybeSingle(),
  ]);

  if (!invoice || !org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: customer } = await admin.from("customers").select("*").eq("id", pt.customer_id).single();
  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  const invoiceNum = invoice.invoice_number ?? `INV-${invoiceId.slice(0, 8).toUpperCase()}`;
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoiceNum}.pdf"`,
    },
  });
}
