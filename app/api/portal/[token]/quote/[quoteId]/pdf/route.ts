import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuotePDF } from "@/lib/pdf/QuotePDF";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string; quoteId: string }> }
) {
  const { token, quoteId } = await params;
  const forceDownload = new URL(req.url).searchParams.get("dl") === "1";
  const admin = createAdminClient();

  const { data: pt } = await admin
    .from("customer_portal_tokens")
    .select("customer_id,org_id,expires_at")
    .eq("token", token)
    .single();

  if (!pt || new Date(pt.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  }

  const [{ data: quote }, { data: items }, { data: org }, { data: settings }, { data: quoteNotes }] = await Promise.all([
    admin.from("quotes").select("*").eq("id", quoteId).eq("customer_id", pt.customer_id).eq("org_id", pt.org_id).single(),
    admin.from("quote_items").select("*").eq("quote_id", quoteId).eq("org_id", pt.org_id),
    admin.from("orgs").select("*").eq("id", pt.org_id).single(),
    admin.from("org_settings").select("*").eq("org_id", pt.org_id).maybeSingle(),
    admin.from("notes").select("body").eq("entity_type", "quote").eq("entity_id", quoteId).eq("org_id", pt.org_id).like("body", "__warranty__%"),
  ]);

  if (!quote || !org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: customer } = await admin.from("customers").select("*").eq("id", pt.customer_id).single();
  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  const quoteNum = `Q-${quoteId.slice(0, 8).toUpperCase()}`;
  const disposition = forceDownload
    ? `attachment; filename="${quoteNum}.pdf"`
    : `inline; filename="${quoteNum}.pdf"`;
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
    },
  });
}
