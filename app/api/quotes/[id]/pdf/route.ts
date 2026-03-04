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

  const [{ data: quote }, { data: items }, { data: org }, { data: settings }] = await Promise.all([
    admin.from("quotes").select("*").eq("id", id).eq("org_id", orgId!).single(),
    admin.from("quote_items").select("*").eq("quote_id", id).eq("org_id", orgId!),
    admin.from("orgs").select("*").eq("id", orgId!).single(),
    admin.from("org_settings").select("*").eq("org_id", orgId!).maybeSingle(),
  ]);

  if (!quote || !org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: customer } = await admin.from("customers").select("*").eq("id", quote.customer_id).single();
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    React.createElement(QuotePDF, {
      quote,
      items: items ?? [],
      customer,
      org,
      settings: settings as any,
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
