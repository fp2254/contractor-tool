import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { getOrgIsDemo } from "@/lib/demo";
import { AiCaptureModal } from "@/components/AiCaptureModal";
import { PermitAssistant } from "@/components/PermitAssistant";
import OpsBoard from "@/components/OpsBoard";
import SetupChecklist from "@/components/SetupChecklist";

export default async function DashboardPage() {
  const supabase = await createClient();
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const isDemo = await getOrgIsDemo(orgId!);

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
    {
      label: "New Leads",
      display: newLeadsCount > 0 ? String(newLeadsCount) : null,
      emptyText: "No leads yet",
      microcopy: "View leads",
      color: "#F97316",
      href: "/app/leads",
    },
    {
      label: "Jobs Today",
      display: jobsTodayCount > 0 ? String(jobsTodayCount) : null,
      emptyText: "None today",
      microcopy: "View jobs",
      color: "#22C55E",
      href: "/app/jobs",
    },
    {
      label: "Unpaid",
      display: unpaidTotal > 0 ? `$${unpaidTotal.toLocaleString()}` : null,
      emptyText: "All clear",
      microcopy: "View invoices",
      color: "#EF4444",
      href: "/app/invoices",
    },
    {
      label: "Estimates",
      display: estimatesCount > 0 ? String(estimatesCount) : null,
      emptyText: "None sent",
      microcopy: "View estimates",
      color: "#3B82F6",
      href: sentQuotesHref,
    },
  ];

  const allCaughtUp = overdueInvoices.length === 0 && estimatesCount === 0;

  // Next Action — priority-ordered nudge
  let nextAction: { label: string; cta: string; href: string } | null = null;
  if (unpaidTotal > 0) {
    nextAction = { label: "You have unpaid invoices.", cta: "Collect payment", href: "/app/invoices" };
  } else if (estimatesCount > 0) {
    nextAction = { label: "Quotes are waiting for a response.", cta: "Review estimates", href: sentQuotesHref };
  } else if (newLeadsCount > 0) {
    nextAction = { label: "New leads need a quote.", cta: "Create a quote", href: "/app/quotes/new" };
  } else if (jobsTodayCount > 0) {
    nextAction = { label: "You have jobs on the schedule.", cta: "View today's jobs", href: "/app/jobs" };
  } else {
    nextAction = { label: "No active work yet.", cta: "Add your first lead", href: "/app/leads" };
  }

  return (
    <div className="p-3 space-y-2 pb-28">
      {!isDemo && <SetupChecklist orgId={orgId!} />}

      {/* 1. Stat Cards */}
      <div className="bg-white rounded-2xl px-3 pt-3 pb-3 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-2">Dashboard</h2>
        <div className="grid grid-cols-4 gap-1.5">
          {statCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-xl p-2 flex flex-col items-center text-white text-center shadow active:opacity-70 transition-opacity"
              style={{ backgroundColor: card.color }}>
              <span className="text-[10px] font-semibold leading-tight opacity-90">{card.label}</span>
              {card.display ? (
                <span className="text-xl font-bold mt-0.5 leading-none">{card.display}</span>
              ) : (
                <span className="text-[9px] font-semibold mt-1 opacity-80 leading-snug">{card.emptyText}</span>
              )}
              <span className="text-[8px] opacity-55 mt-0.5 leading-none">{card.microcopy}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 2. Next Action */}
      {nextAction && (
        <Link
          href={nextAction.href}
          className="flex items-center gap-3 bg-[#1B3A6B] text-white rounded-2xl px-4 py-3 shadow-sm active:opacity-80 transition-opacity">
          <span className="text-xl shrink-0">👉</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] opacity-75 leading-tight">Next step</p>
            <p className="text-sm font-bold leading-snug">{nextAction.cta}</p>
            <p className="text-[11px] opacity-65 leading-tight mt-0.5">{nextAction.label}</p>
          </div>
          <span className="text-white opacity-50 text-lg shrink-0">›</span>
        </Link>
      )}

      {/* 3. AI Job Capture */}
      <div className="bg-white rounded-2xl px-3 pt-3 pb-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">✨</span>
          <h2 className="text-sm font-bold text-slate-800">AI Job Capture</h2>
          <span className="ml-auto text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 uppercase tracking-wide">AI</span>
        </div>
        <p className="text-xs text-gray-400 mb-2.5">Describe the job. We&apos;ll build it fast.</p>
        <AiCaptureModal defaultWarrantyText={defaultWarrantyText} />
      </div>

      {/* 4. Needs Attention */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-3 pt-2.5 pb-1.5">
          <h2 className="text-sm font-bold text-slate-800">Needs Attention</h2>
        </div>
        {allCaughtUp ? (
          <div className="px-3 pb-3 flex items-center gap-2.5">
            <span className="text-base shrink-0">✅</span>
            <div>
              <p className="text-xs font-semibold text-slate-700">You&apos;re all caught up</p>
              <p className="text-[11px] text-gray-400">Nothing needs your attention right now.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {estimatesCount > 0 && (
              <Link href={sentQuotesHref} className="flex items-center gap-2 px-3 py-2 active:bg-gray-50">
                <span className="text-sm shrink-0">⚠️</span>
                <span className="text-xs text-slate-700 flex-1">
                  {estimatesCount} quote{estimatesCount > 1 ? "s" : ""} awaiting response
                </span>
                <span className="text-gray-400 text-xs shrink-0">›</span>
              </Link>
            )}
            {overdueInvoices.map((inv) => (
              <Link key={inv.id} href="/app/invoices" className="flex items-center gap-2 px-3 py-2 active:bg-gray-50">
                <span className="text-sm shrink-0">🔴</span>
                <span className="text-xs text-slate-700 flex-1">
                  Overdue Invoice – ${Number(inv.total_amount).toLocaleString()}
                </span>
                <span className="text-gray-400 text-xs shrink-0">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 5. Today's Ops */}
      <OpsBoard />

      {/* 6. Quick Actions (Pinned) */}
      <div className="bg-white rounded-2xl px-3 pt-3 pb-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-slate-800">Quick Actions</h2>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Pinned</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {[
            { label: "New Quote", href: "/app/quotes/new", icon: "📋" },
            { label: "Add Lead", href: "/app/leads", icon: "👤" },
            { label: "Collect Payment", href: "/app/invoices", icon: "💰" },
            { label: "Schedule Job", href: "/app/jobs", icon: "📅" },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-white font-semibold text-xs active:opacity-75 transition-opacity"
              style={{ backgroundColor: "#1B3A6B" }}>
              <span className="text-base">{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </div>
        <PermitAssistant />
      </div>

      {isDemo && (
        <div className="bg-white rounded-2xl px-3 pt-3 pb-3 shadow-sm border border-amber-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🗺️</span>
            <h2 className="text-sm font-bold text-slate-800">Start Here</h2>
            <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 uppercase tracking-wide">Demo</span>
          </div>
          <p className="text-xs text-gray-400 mb-2">Tap through these to see what TradeBase can do:</p>
          <div className="space-y-1.5">
            {[
              { label: "Review a lead", href: "/app/leads", icon: "📥" },
              { label: "Open a quote", href: "/app/quotes", icon: "📋" },
              { label: "Check the jobs board", href: "/app/jobs", icon: "🔨" },
              { label: "View the calendar", href: "/app/jobs?view=calendar", icon: "📅" },
              { label: "Mark an invoice paid", href: "/app/invoices", icon: "💵" },
              { label: "Try AI Job Capture", href: null, icon: "🤖" },
            ].map((step) =>
              step.href ? (
                <Link key={step.label} href={step.href}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 bg-gray-50 active:bg-blue-50">
                  <span className="text-sm">{step.icon}</span>
                  <span className="text-xs font-medium text-slate-700">{step.label}</span>
                  <span className="ml-auto text-gray-300 text-xs">›</span>
                </Link>
              ) : (
                <div key={step.label} className="flex items-center gap-2 rounded-xl px-3 py-2 bg-gray-50">
                  <span className="text-sm">{step.icon}</span>
                  <span className="text-xs font-medium text-slate-700">
                    {step.label} <span className="text-gray-400">(tap above ↑)</span>
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
