import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

export default async function DashboardPage() {
  const supabase = await createClient();
  const orgId = await ensureUserOrg();
  const followupCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const [customers, quotes, invoices, jobs, needsFollowup] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("org_id", orgId!),
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("org_id", orgId!),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("org_id", orgId!),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("org_id", orgId!),
    supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId!)
      .eq("status", "sent")
      .lte("sent_at", followupCutoff)
      .is("accepted_at", null)
      .is("declined_at", null),
  ]);

  return (
    <div className="grid gap-4">
      <Card title="Dashboard">
        <p className="text-slate-600">Welcome back. Here are your totals.</p>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Card title="Customers">{customers.count ?? 0}</Card>
        <Card title="Quotes">{quotes.count ?? 0}</Card>
        <Card title="Invoices">{invoices.count ?? 0}</Card>
        <Card title="Jobs">{jobs.count ?? 0}</Card>
      </div>
      <Card title="Needs Attention">
        <Link href="/app/followups" className="block rounded-lg bg-amber-50 p-4 ring-1 ring-amber-200">
          <p className="font-semibold">{needsFollowup.count ?? 0} quotes need follow-up</p>
          <p className="text-sm text-slate-600">Tap to send reminders or skip.</p>
        </Link>
      </Card>
    </div>
  );
}
