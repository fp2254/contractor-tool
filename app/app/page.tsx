import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { getOrgIsDemo } from "@/lib/demo";
import { AiCaptureModal } from "@/components/AiCaptureModal";
import OpsBoard from "@/components/OpsBoard";
import SetupChecklist from "@/components/SetupChecklist";
import { HomeFloatingActions } from "@/components/HomeFloatingActions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const isDemo = await getOrgIsDemo(orgId!);

  const [leads, jobs, invoices, quotes, orgSettings, pubProfileResult] = await Promise.all([
    admin.from("leads").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("status", "new"),
    admin.from("jobs").select("id,scheduled_date,status", { count: "exact" }).eq("org_id", orgId!),
    admin.from("invoices").select("id,status,total_amount").eq("org_id", orgId!),
    admin.from("quotes").select("id").eq("org_id", orgId!).eq("status", "sent"),
    admin.from("org_settings").select("default_warranty_text").eq("org_id", orgId!).maybeSingle(),
    (async () => { try { return await (admin as any).from("public_profiles").select("slug,is_published").eq("org_id", orgId!).maybeSingle(); } catch { return { data: null }; } })(),
  ]);

  // Suppress unused import warning — supabase client kept for session context
  void supabase;

  const pubProfile = (pubProfileResult as any)?.data ?? null;
  const defaultWarrantyText = (orgSettings.data as { default_warranty_text?: string } | null)?.default_warranty_text ?? "";

  const today = new Date().toISOString().slice(0, 10);
  const jobsTodayCount = jobs.data?.filter(j => j.scheduled_date === today).length ?? 0;
  const newLeadsCount = leads.count ?? 0;
  const unpaidTotal = invoices.data
    ?.filter(i => i.status === "unpaid" || i.status === "overdue")
    .reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0) ?? 0;
  const overdueInvoices = invoices.data?.filter(i => i.status === "overdue") ?? [];
  const sentQuotes = quotes.data ?? [];
  const estimatesCount = sentQuotes.length;
  const sentQuotesHref = sentQuotes.length === 1 ? `/app/quotes/${sentQuotes[0].id}` : "/app/quotes";

  const allCaughtUp = overdueInvoices.length === 0 && estimatesCount === 0;

  // Uniform stat cards — color only where semantically needed
  const statCards = [
    {
      label: "New Leads",
      display: newLeadsCount > 0 ? String(newLeadsCount) : null,
      emptyText: "None",
      alert: false,
      allClear: false,
      href: "/app/leads",
    },
    {
      label: "Jobs Today",
      display: jobsTodayCount > 0 ? String(jobsTodayCount) : null,
      emptyText: "None",
      alert: false,
      allClear: jobsTodayCount === 0,
      href: "/app/jobs",
    },
    {
      label: "Unpaid",
      display: unpaidTotal > 0 ? `$${unpaidTotal.toLocaleString()}` : null,
      emptyText: "Clear",
      alert: unpaidTotal > 0,
      allClear: unpaidTotal === 0,
      href: "/app/invoices",
    },
    {
      label: "Estimates",
      display: estimatesCount > 0 ? String(estimatesCount) : null,
      emptyText: "None",
      alert: false,
      allClear: false,
      href: sentQuotesHref,
    },
  ];

  // Next Step — priority-ordered, most urgent first
  let nextStep: { context: string; cta: string; href: string } | null = null;
  if (unpaidTotal > 0) {
    nextStep = { context: "You have unpaid invoices.", cta: "Collect Payment", href: "/app/invoices" };
  } else if (estimatesCount > 0) {
    nextStep = { context: "Quotes are waiting for a response.", cta: "Review Estimates", href: sentQuotesHref };
  } else if (newLeadsCount > 0) {
    nextStep = { context: "New leads are waiting on a quote.", cta: "Create a Quote", href: "/app/quotes/new" };
  } else if (jobsTodayCount > 0) {
    nextStep = { context: "You have jobs on the schedule today.", cta: "View Today's Jobs", href: "/app/jobs" };
  } else {
    nextStep = { context: "Nothing in progress yet — start your first job.", cta: "Add Your First Lead", href: "/app/leads" };
  }

  return (
    <div className="p-3 space-y-3 pb-28">
      {!isDemo && <SetupChecklist orgId={orgId!} />}

      {/* ── 1. NEEDS ATTENTION ─────────────────────────────────── */}
      <div
        className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${
          allCaughtUp ? "border-green-500" : "border-red-500"
        }`}
      >
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-base font-bold text-slate-800">Needs Attention</h2>
        </div>
        {allCaughtUp ? (
          <div className="px-4 pb-4 flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <span className="text-green-600 text-xs font-bold">✓</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">You&apos;re all caught up</p>
              <p className="text-xs text-gray-400 mt-0.5">Nothing needs your attention right now.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 pb-1">
            {estimatesCount > 0 && (
              <Link href={sentQuotesHref} className="flex items-center gap-3 px-4 py-3 active:bg-gray-50 transition-colors">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-sm text-slate-700 flex-1">
                  {estimatesCount} quote{estimatesCount > 1 ? "s" : ""} awaiting response
                </span>
                <span className="text-gray-400 text-sm shrink-0">›</span>
              </Link>
            )}
            {overdueInvoices.map((inv) => (
              <Link key={inv.id} href="/app/invoices" className="flex items-center gap-3 px-4 py-3 active:bg-gray-50 transition-colors">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-sm text-slate-700 flex-1">
                  Overdue invoice — ${Number(inv.total_amount).toLocaleString()}
                </span>
                <span className="text-gray-400 text-sm shrink-0">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── 2. TODAY'S OPS — uniform stat row ──────────────────── */}
      <div className="bg-white rounded-2xl px-4 pt-4 pb-4 shadow-sm">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Today&apos;s Overview</p>
        <div className="grid grid-cols-4 gap-2">
          {statCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="bg-gray-50 rounded-xl px-2 py-3 flex flex-col items-center text-center active:bg-gray-100 transition-colors"
            >
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide leading-tight mb-1.5">
                {card.label}
              </span>
              {card.display ? (
                <span
                  className={`text-[20px] font-bold leading-none ${
                    card.alert ? "text-red-600" : "text-slate-800"
                  }`}
                >
                  {card.display}
                </span>
              ) : (
                <span
                  className={`text-[10px] font-semibold leading-snug ${
                    card.allClear ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {card.emptyText}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Profile live banner */}
      {pubProfile?.is_published && pubProfile?.slug && (
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-green-700 leading-tight">Your profile is live</p>
            <p className="text-[11px] text-gray-400 truncate">tradebase.contractors/pro/{pubProfile.slug}</p>
          </div>
          <a
            href={`https://tradebase.contractors/pro/${pubProfile.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-[11px] font-bold text-[#1B3A6B] bg-blue-50 rounded-lg px-3 py-1.5"
          >
            View ↗
          </a>
        </div>
      )}

      {/* OpsBoard — task-level ops */}
      <OpsBoard />

      {/* ── 3. AI JOB CAPTURE — primary action ─────────────────── */}
      <div className="bg-white rounded-2xl px-4 pt-5 pb-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg leading-none">✨</span>
          <h2 className="text-sm font-bold text-slate-800">AI Job Capture</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Describe the job. We&apos;ll build it fast.</p>
        <Suspense fallback={null}>
          <AiCaptureModal defaultWarrantyText={defaultWarrantyText} />
        </Suspense>
      </div>

      {/* ── 4. NEXT STEP ────────────────────────────────────────── */}
      {nextStep && (
        <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border-l-4 border-[#1B3A6B]">
          <p className="text-[10px] font-bold text-[#1B3A6B] uppercase tracking-wide mb-1.5">Next Step</p>
          <p className="text-sm text-slate-500 mb-3 leading-snug">{nextStep.context}</p>
          <Link
            href={nextStep.href}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-white font-bold text-sm active:opacity-75 transition-opacity shadow-sm"
            style={{ backgroundColor: "#1B3A6B" }}
          >
            {nextStep.cta}
            <span className="text-base leading-none">›</span>
          </Link>
        </div>
      )}

      {/* ── 5. QUICK ACTIONS — daily toolbelt ──────────────────── */}
      <div className="bg-white rounded-2xl px-4 pt-4 pb-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800">Quick Actions</h2>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Daily Toolbelt</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "New Quote", href: "/app/quotes/new", icon: "📋" },
            { label: "Add Lead", href: "/app/leads", icon: "👤" },
            { label: "Collect Payment", href: "/app/invoices", icon: "💰" },
            { label: "Schedule Job", href: "/app/jobs", icon: "📅" },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-2 rounded-xl px-3 py-3 text-white font-semibold text-sm active:opacity-75 transition-opacity"
              style={{ backgroundColor: "#1B3A6B" }}
            >
              <span className="text-base">{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Demo guide */}
      {isDemo && (
        <div className="bg-white rounded-2xl px-4 pt-4 pb-4 shadow-sm border border-amber-100">
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

      {/* ── 6. FLOATING + BUTTON — global actions ──────────────── */}
      <HomeFloatingActions />
    </div>
  );
}
