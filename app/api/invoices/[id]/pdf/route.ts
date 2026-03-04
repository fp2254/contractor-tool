import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { InvoicePDF } from "@/lib/pdf/InvoicePDF";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [{ data: invoice }, { data: items }, { data: org }, { data: settings }] = await Promise.all([
    admin.from("invoices").select("*").eq("id", id).eq("org_id", orgId!).single(),
    admin.from("invoice_items").select("*").eq("invoice_id", id).eq("org_id", orgId!),
    admin.from("orgs").select("*").eq("id", orgId!).single(),
    admin.from("org_settings").select("*").eq("org_id", orgId!).maybeSingle(),
  ]);

  if (!invoice || !org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: customer } = await admin.from("customers").select("*").eq("id", invoice.customer_id).single();
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
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
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoiceNum}.pdf"`,
    },
  });
}
