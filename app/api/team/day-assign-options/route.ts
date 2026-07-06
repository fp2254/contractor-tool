import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/team/day-assign-options
 * Returns customers + unscheduled jobs for the Team calendar's "Assign job" modal.
 */
export async function GET() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [{ data: customers }, { data: jobs }] = await Promise.all([
    admin
      .from("customers")
      .select("id,first_name,last_name,company_name")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false }),
    admin
      .from("jobs")
      .select("id,job_title,customer_id")
      .eq("org_id", orgId!)
      .is("scheduled_date", null)
      .not("status", "in", "(completed,cancelled)"),
  ]);

  const customerMap = Object.fromEntries(
    (customers ?? []).map(c => [c.id, [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "Unnamed"])
  );

  return NextResponse.json({
    customers: (customers ?? []).map(c => ({
      id: c.id,
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "Unnamed",
    })),
    unscheduledJobs: (jobs ?? []).map(j => ({
      id: j.id,
      title: j.job_title ?? "Untitled",
      customerName: customerMap[j.customer_id ?? ""] ?? "Unknown",
    })),
  });
}
