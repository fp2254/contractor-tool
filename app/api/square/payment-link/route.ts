import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { invoice_id } = await req.json() as { invoice_id: string };
  if (!invoice_id) return NextResponse.json({ error: "invoice_id required" }, { status: 400 });

  const admin = createAdminClient();

  // Get org's Square credentials
  const { data: settings } = await (admin as any)
    .from("org_settings")
    .select("square_access_token, square_location_id")
    .eq("org_id", orgId)
    .single();

  if (!settings?.square_access_token) {
    return NextResponse.json({ error: "Square not connected" }, { status: 400 });
  }

  // Get invoice details
  const { data: invoice } = await admin
    .from("invoices")
    .select("id, invoice_number, total_amount, customer_id")
    .eq("id", invoice_id)
    .eq("org_id", orgId)
    .single();

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const { data: customer } = await admin
    .from("customers")
    .select("first_name, last_name, company_name")
    .eq("id", invoice.customer_id)
    .single();

  const customerName =
    [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
    customer?.company_name ||
    "Customer";

  const invoiceLabel = invoice.invoice_number ?? `INV-${invoice_id.slice(0, 8).toUpperCase()}`;
  const amountCents = Math.round(Number(invoice.total_amount) * 100);

  const apiBase = process.env.SQUARE_SANDBOX === "true"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

  const idempotencyKey = `tradebase-${invoice_id}-${Date.now()}`;

  const body = {
    idempotency_key: idempotencyKey,
    order: {
      location_id: settings.square_location_id,
      line_items: [
        {
          name: `${invoiceLabel} — ${customerName}`,
          quantity: "1",
          base_price_money: {
            amount: amountCents,
            currency: "USD",
          },
        },
      ],
    },
    checkout_options: {
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/invoices/${invoice_id}`,
      ask_for_shipping_address: false,
    },
    payment_note: `TradeBase invoice ${invoiceLabel}`,
  };

  const res = await fetch(`${apiBase}/v2/online-checkout/payment-links`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.square_access_token}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json() as {
    payment_link?: { url: string; id: string };
    errors?: { detail: string; category: string }[];
  };

  if (!res.ok || !data.payment_link) {
    const detail = data.errors?.[0]?.detail ?? "Unknown error";
    console.error("[Square] Payment link failed:", data.errors);
    return NextResponse.json({ error: detail }, { status: 400 });
  }

  return NextResponse.json({ url: data.payment_link.url });
}
