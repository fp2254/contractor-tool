import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export async function GET() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { data } = await admin.from("invoices").select("*").eq("org_id", orgId!).order("created_at");

  const headers = ["id","customer_id","job_id","invoice_number","status","total_amount","due_date","created_at"];
  const rows = (data ?? []).map(r =>
    headers.map(h => JSON.stringify((r as any)[h] ?? "")).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="invoices-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
