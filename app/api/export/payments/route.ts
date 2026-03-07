import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { toCSV, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin
    .from("payments")
    .select("payment_date,amount,payment_method,invoice_id,invoices(invoice_number,customers(first_name,last_name,company_name))")
    .eq("org_id", orgId!)
    .order("payment_date", { ascending: false });

  if (start) query = query.gte("payment_date", start);
  if (end) query = query.lte("payment_date", end);

  const { data } = await query;

  const rows = ((data ?? []) as Record<string, unknown>[]).map((p) => {
    const inv = p.invoices as Record<string, unknown> | null;
    const cust = inv?.customers as Record<string, unknown> | null;
    const clientName = cust
      ? ([cust.first_name, cust.last_name].filter(Boolean).join(" ") || cust.company_name || "")
      : "";
    const invoiceNum = inv?.invoice_number ?? (p.invoice_id ? `INV-${String(p.invoice_id).slice(0, 8).toUpperCase()}` : "");
    return {
      payment_date: p.payment_date ?? "",
      amount: Number(p.amount ?? 0).toFixed(2),
      payment_method: p.payment_method ?? "",
      invoice_number: invoiceNum,
      client_name: clientName,
    };
  });

  return csvResponse(toCSV(rows), `tradebase-payments-${today()}.csv`);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
