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
    .from("customers")
    .select("first_name,last_name,company_name,phone,email,address_line1,city,state,zip,created_at")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: false });

  if (start) query = query.gte("created_at", start);
  if (end) query = query.lte("created_at", end + "T23:59:59");

  const { data } = await query;

  const rows = ((data ?? []) as Record<string, unknown>[]).map((c) => ({
    name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "",
    company: c.company_name ?? "",
    phone: c.phone ?? "",
    email: c.email ?? "",
    address: [c.address_line1, c.city, c.state, c.zip].filter(Boolean).join(", "),
    created_date: c.created_at ? String(c.created_at).slice(0, 10) : "",
  }));

  return csvResponse(toCSV(rows), `tradebase-clients-${today()}.csv`);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
