import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuotePDF } from "@/lib/pdf/QuotePDF";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: quote } = await admin
    .from("quotes")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  if (!quote) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ data: items }, { data: org }, { data: settings }, { data: customer }] = await Promise.all([
    admin.from("quote_items").select("*").eq("quote_id", quote.id),
    admin.from("orgs").select("*").eq("id", quote.org_id).single(),
    admin.from("org_settings").select("*").eq("org_id", quote.org_id).maybeSingle(),
    admin.from("customers").select("*").eq("id", quote.customer_id).single(),
  ]);

  if (!org || !customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    React.createElement(QuotePDF, {
      quote,
      items: items ?? [],
      customer,
      org,
      settings: settings as never,
    })
  );

  const quoteNum = `Q-${quote.id.slice(0, 8).toUpperCase()}`;
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quoteNum}.pdf"`,
    },
  });
}
