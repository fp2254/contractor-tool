import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { QuotePDF } from "@/lib/pdf/QuotePDF";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [{ data: quote }, { data: items }, { data: org }, { data: settings }, { data: quoteNotes }] = await Promise.all([
    admin.from("quotes").select("*").eq("id", id).eq("org_id", orgId!).single(),
    admin.from("quote_items").select("*").eq("quote_id", id).eq("org_id", orgId!),
    admin.from("orgs").select("*").eq("id", orgId!).single(),
    admin.from("org_settings").select("*").eq("org_id", orgId!).maybeSingle(),
    admin.from("notes").select("body").eq("entity_type", "quote").eq("entity_id", id).eq("org_id", orgId!).like("body", "__warranty__%"),
  ]);

  if (!quote || !org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: customer } = await admin.from("customers").select("*").eq("id", quote.customer_id).eq("org_id", orgId!).single();
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const quoteWarrantyNote = (quoteNotes ?? [])[0];
  const warrantyText: string | null = quoteWarrantyNote
    ? String(quoteWarrantyNote.body).replace("__warranty__:", "")
    : null;

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
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quoteNum}.pdf"`,
    },
  });
}
