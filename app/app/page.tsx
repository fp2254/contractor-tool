import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { AiCaptureModal } from "@/components/AiCaptureModal";
import { PermitAssistant } from "@/components/PermitAssistant";
import { VoiceJobModal } from "@/components/VoiceJobModal";
import OpsBoard from "@/components/OpsBoard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [leads, jobs, invoices, quotes] = await Promise.all([
    admin.from("leads").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("status", "new"),
    admin.from("jobs").select("id,scheduled_date,status", { count: "exact" }).eq("org_id", orgId!),
    admin.from("invoices").select("id,status,total_amount").eq("org_id", orgId!),
    admin.from("quotes").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("status", "sent"),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const jobsTodayCount = jobs.data?.filter(j => j.scheduled_date === today).length ?? 0;
  const newLeadsCount = leads.count ?? 0;
  const unpaidTotal = invoices.data?.filter(i => i.status === "unpaid" || i.status === "overdue")
    .reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0) ?? 0;
  const estimatesCount = quotes.count ?? 0;

  const overdueInvoices = invoices.data?.filter(i => i.status === "overdue") ?? [];

  const statCards = [
    { label: "New Leads", value: newLeadsCount, color: "#F97316", href: "/app/leads" },
    { label: "Jobs Today", value: jobsTodayCount, color: "#22C55E", href: "/app/jobs" },
    { label: "Unpaid", value: `$${unpaidTotal.toLocaleString()}`, color: "#EF4444", href: "/app/money" },
    { label: "Estimates", value: estimatesCount, color: "#3B82F6", href: "/app/quotes" },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-3">Dashboard</h2>
        <div className="grid grid-cols-4 gap-2">
          {statCards.map((card) => (
            <Link key={card.label} href={card.href}
              className="rounded-xl p-2 flex flex-col items-center text-white text-center"
              style={{ backgroundColor: card.color }}>
              <span className="text-[10px] font-semibold leading-tight">{card.label}</span>
              <span className="text-2xl font-bold mt-1">{card.value}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-base font-bold text-slate-800">Needs Attention</h2>
        </div>
        {overdueInvoices.length === 0 && estimatesCount === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">Nothing urgent.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {estimatesCount > 0 && (
              <Link href="/app/quotes" className="flex items-center gap-3 px-4 py-3">
                <span className="text-yellow-500 text-lg">⚠️</span>
                <span className="text-sm text-slate-700 flex-1">
                  {estimatesCount} quote{estimatesCount > 1 ? "s" : ""} awaiting response
                </span>
                <span className="text-gray-400">›</span>
              </Link>
            )}
            {overdueInvoices.map((inv) => (
              <Link key={inv.id} href="/app/money" className="flex items-center gap-3 px-4 py-3">
                <span className="text-red-500 text-lg">🔴</span>
                <span className="text-sm text-slate-700 flex-1">
                  Overdue Invoice – ${Number(inv.total_amount).toLocaleString()}
                </span>
                <span className="text-gray-400">›</span>
              </Link>
            ))}
            {overdueInvoices.length === 0 && estimatesCount === 0 && (
              <div className="px-4 py-3 text-center text-sm text-gray-400">Nothing urgent.</div>
            )}
          </div>
        )}
        {estimatesCount === 0 && overdueInvoices.length === 0 && null}
      </div>

      <OpsBoard />

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { label: "New Quote", href: "/app/quotes/new", icon: "📋" },
            { label: "Add Lead", href: "/app/leads", icon: "👤" },
            { label: "Collect Payment", href: "/app/money", icon: "💰" },
            { label: "Schedule Job", href: "/app/jobs", icon: "📅" },
          ].map((action) => (
            <Link key={action.label} href={action.href}
              className="flex items-center gap-3 rounded-xl px-4 py-4 text-white font-semibold text-sm"
              style={{ backgroundColor: "#1B3A6B" }}>
              <span className="text-xl">{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </div>
        <PermitAssistant />
        <AiCaptureModal />
        <VoiceJobModal />
      </div>
    </div>
  );
}
