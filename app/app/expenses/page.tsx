import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import ExpensesClient from "./ExpensesClient";

export default async function ExpensesPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [expensesRes, jobsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from("expenses")
      .select("id,vendor,description,receipt_date,total_amount,category,job_id,notes,created_at")
      .eq("org_id", orgId!)
      .order("receipt_date", { ascending: false })
      .limit(200),
    admin
      .from("jobs")
      .select("id,job_title,customer_id")
      .eq("org_id", orgId!)
      .in("status", ["scheduled", "in_progress", "completed"])
      .order("scheduled_date", { ascending: false })
      .limit(100),
  ]);

  const expenses = (expensesRes.data ?? []) as {
    id: string;
    vendor: string;
    description: string | null;
    receipt_date: string | null;
    total_amount: number;
    category: string | null;
    job_id: string | null;
    notes: string | null;
    created_at: string;
  }[];

  const jobs = (jobsRes.data ?? []) as { id: string; job_title: string; customer_id: string }[];

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold text-slate-800">Expenses</h1>
      <ExpensesClient initialExpenses={expenses} jobs={jobs} />
    </div>
  );
}
