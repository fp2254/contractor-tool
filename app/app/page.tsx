import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { AiCaptureModal } from "@/components/AiCaptureModal";
import { PermitAssistant } from "@/components/PermitAssistant";
import OpsBoard from "@/components/OpsBoard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [leads, jobs, invoices, quotes, orgSettings] = await Promise.all([
    admin.from("leads").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("status", "new"),
    admin.from("jobs").select("id,scheduled_date,status", { count: "exact" }).eq("org_id", orgId!),
    admin.from("invoices").select("id,status,total_amount").eq("org_id", orgId!),
    admin.from("quotes").select("id").eq("org_id", orgId!).eq("status", "sent"),
    admin.from("org_settings").select("default_warranty_text").eq("org_id", orgId!).maybeSingle(),
  ]);

  const defaultWarrantyText = (orgSettings.data as { default_warranty_text?: string } | null)?.default_warranty_text ?? "";

  const today = new Date().toISOString().slice(0, 10);
  const jobsTodayCount = jobs.data?.filter(j => j.scheduled_date === today).length ?? 0;
  const newLeadsCount = leads.count ?? 0;
  const unpaidTotal = invoices.data?.filter(i => i.status === "unpaid" || i.status === "overdue")
    .reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0) ?? 0;

  const overdueInvoices = invoices.data?.filter(i => i.status === "overdue") ?? [];

  const sentQuotes = quotes.data ?? [];
  const estimatesCount = sentQuotes.length;
  const sentQuotesHref = sentQuotes.length === 1
    ? `/app/quotes/${sentQuotes[0].id}`
    : "/app/quotes";

  const statCards = [
    { label: "New Leads", value: newLeadsCount, color: "#F97316", href: "/app/leads" },
    { label: "Jobs Today", value: jobsTodayCount, color: "#22C55E", href: "/app/jobs" },
    { label: "Unpaid", value: `$${unpaidTotal.toLocaleString()}`, color: "#EF4444", href: "/app/invoices" },
    { label: "Estimates", value: estimatesCount, color: "#3B82F6", href: sentQuotesHref },
  ];

  return (
    <div className="p-3 space-y-2">
      <div className="bg-white rounded-2xl px-3 pt-3 pb-3 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-2">Dashboard</h2>
        <div className="grid grid-cols-4 gap-1.5">
          {statCards.map((card) => (
            <Link key={card.label} href={card.href}
              className="rounded-xl p-2 flex flex-col items-center text-white text-center"
              style={{ backgroundColor: card.color }}>
              <span className="text-[10px] font-semibold leading-tight">{card.label}</span>
              <span className="text-xl font-bold mt-0.5">{card.value}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-3 pt-2.5 pb-1.5">
          <h2 className="text-sm font-bold text-slate-800">Needs Attention</h2>
        </div>
        {overdueInvoices.length === 0 && estimatesCount === 0 ? (
          <div className="px-3 pb-2.5 text-xs text-gray-400">Nothing urgent.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {estimatesCount > 0 && (
              <Link href={sentQuotesHref} className="flex items-center gap-2 px-3 py-2">
                <span className="text-yellow-500 text-sm">⚠️</span>
                <span className="text-xs text-slate-700 flex-1">
                  {estimatesCount} quote{estimatesCount > 1 ? "s" : ""} awaiting response
                </span>
                <span className="text-gray-400 text-xs">›</span>
              </Link>
            )}
            {overdueInvoices.map((inv) => (
              <Link key={inv.id} href="/app/invoices" className="flex items-center gap-2 px-3 py-2">
                <span className="text-red-500 text-sm">🔴</span>
                <span className="text-xs text-slate-700 flex-1">
                  Overdue Invoice – ${Number(inv.total_amount).toLocaleString()}
                </span>
                <span className="text-gray-400 text-xs">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <OpsBoard />

      <div className="bg-white rounded-2xl px-3 pt-3 pb-3 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-2">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {[
            { label: "New Quote", href: "/app/quotes/new", icon: "📋" },
            { label: "Add Lead", href: "/app/leads", icon: "👤" },
            { label: "Collect Payment", href: "/app/invoices", icon: "💰" },
            { label: "Schedule Job", href: "/app/jobs", icon: "📅" },
          ].map((action) => (
            <Link key={action.label} href={action.href}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-white font-semibold text-xs"
              style={{ backgroundColor: "#1B3A6B" }}>
              <span className="text-base">{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </div>
        <div className="space-y-1.5">
          <PermitAssistant />
          <AiCaptureModal defaultWarrantyText={defaultWarrantyText} />
        </div>
      </div>
    </div>
  );
}
