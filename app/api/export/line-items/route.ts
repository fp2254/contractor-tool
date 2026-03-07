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
    .from("invoice_items")
    .select("description,quantity,unit_price,total_price,created_at,invoices(invoice_number,created_at,customers(first_name,last_name,company_name))")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: false });

  if (start) query = query.gte("created_at", start);
  if (end) query = query.lte("created_at", end + "T23:59:59");

  const { data } = await query;

  const rows = ((data ?? []) as Record<string, unknown>[]).map((item) => {
    const inv = item.invoices as Record<string, unknown> | null;
    const cust = inv?.customers as Record<string, unknown> | null;
    const clientName = cust
      ? ([cust.first_name, cust.last_name].filter(Boolean).join(" ") || cust.company_name || "")
      : "";
    const qty = Number(item.quantity ?? 0);
    const price = Number(item.unit_price ?? 0);
    return {
      description: item.description ?? "",
      qty: qty,
      unit_price: price.toFixed(2),
      amount: (qty * price).toFixed(2),
      invoice_number: inv?.invoice_number ?? "",
      client_name: clientName,
      date: item.created_at ? String(item.created_at).slice(0, 10) : "",
    };
  });

  return csvResponse(toCSV(rows), `tradebase-line-items-${today()}.csv`);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
