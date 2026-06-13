import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { getOrgIsDemo } from "@/lib/demo";
import { AiCaptureModal } from "@/components/AiCaptureModal";
import SetupChecklist from "@/components/SetupChecklist";
import { HomeFloatingActions } from "@/components/HomeFloatingActions";
import { CreateNewButton } from "@/components/CreateNewButton";

const ENTITY_META: Record<string, { emoji: string; label: string; href: (id: string) => string }> = {
  job:      { emoji: "🔧", label: "Job",     href: id => `/app/jobs/${id}` },
  quote:    { emoji: "📄", label: "Quote",   href: id => `/app/quotes/${id}` },
  invoice:  { emoji: "💵", label: "Invoice", href: id => `/app/invoices/${id}` },
  lead:     { emoji: "🎯", label: "Lead",    href: id => `/app/leads/${id}` },
  customer: { emoji: "👤", label: "Client",  href: id => `/app/customers/${id}` },
  expense:  { emoji: "💸", label: "Expense", href: () => `/app/expenses` },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const isDemo = await getOrgIsDemo(orgId!);

  // Redirect brand-new accounts to setup wizard
  if (!isDemo) {
    try {
      const cookieStore = await cookies();
      const wizardSkipped = cookieStore.get("tb_wizard_skipped")?.value === "1";
      if (!wizardSkipped) {
        const { data: quickSettings } = await admin
          .from("org_settings")
          .select("primary_phone,city,owner_name")
          .eq("org_id", orgId!)
          .maybeSingle();
        const s = quickSettings as any;
        const isNewAccount = !s?.primary_phone && !s?.city && !s?.owner_name;
        if (isNewAccount) redirect("/app/onboarding");
      }
    } catch {
      // Ignore — never block dashboard load over wizard check
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  const [
    leadsResult,
    jobsResult,
    invoicesResult,
    quotesResult,
    orgSettingsResult,
    pubProfileResult,
    archivedNotesResult,
    customersResult,
    activityResult,
    newLeadsResult,
  ] = await Promise.all([
    admin.from("leads").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("status", "new"),
    admin.from("jobs").select("id,job_title,status,scheduled_date,address,city,state,customer_id").eq("org_id", orgId!),
    admin.from("invoices").select("id,status,total_amount").eq("org_id", orgId!),
    admin.from("quotes").select("id").eq("org_id", orgId!).eq("status", "sent"),
    admin.from("org_settings").select("default_warranty_text,owner_name").eq("org_id", orgId!).maybeSingle(),
    (async () => { try { return await (admin as any).from("public_profiles").select("slug,is_published").eq("org_id", orgId!).maybeSingle(); } catch { return { data: null }; } })(),
    admin.from("notes").select("entity_id").eq("org_id", orgId!).eq("entity_type", "invoice").eq("body", "__archived__"),
    admin.from("customers").select("id,first_name,last_name").eq("org_id", orgId!),
    (async () => { try { return await (admin as any).from("activity_log").select("id,entity_type,entity_id,action,description,created_at").eq("org_id", orgId!).order("created_at", { ascending: false }).limit(5); } catch { return { data: [] }; } })(),
    admin.from("leads").select("id,full_name,source,created_at").eq("org_id", orgId!).eq("status", "new").order("created_at", { ascending: false }).limit(3),
  ]);

  void supabase;

  const defaultWarrantyText = (orgSettingsResult.data as any)?.default_warranty_text ?? "";
  const ownerName: string = (orgSettingsResult.data as any)?.owner_name ?? "";
  const firstName = ownerName.split(" ")[0] || "";

  const archivedInvoiceIds = new Set((archivedNotesResult.data ?? []).map(n => n.entity_id as string));
  const customerMap = Object.fromEntries(
    (customersResult.data ?? []).map(c => [c.id, `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Unknown"])
  );

  const jobsTodayList = (jobsResult.data ?? [])
    .filter(j => j.scheduled_date === today)
    .slice(0, 5);
  const jobsTodayCount = jobsTodayList.length;

  const unpaidTotal = (invoicesResult.data ?? [])
    .filter(i => !archivedInvoiceIds.has(i.id) && (i.status === "unpaid" || i.status === "overdue"))
    .reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  const overdueInvoices = (invoicesResult.data ?? []).filter(i => !archivedInvoiceIds.has(i.id) && i.status === "overdue");

  const sentQuotes = quotesResult.data ?? [];
  const estimatesCount = sentQuotes.length;
  const sentQuotesHref = sentQuotes.length === 1 ? `/app/quotes/${sentQuotes[0].id}` : "/app/quotes?tab=sent";
  const newLeadsCount = leadsResult.count ?? 0;
  const newLeadsData = (newLeadsResult.data ?? []) as { id: string; full_name: string | null; source: string | null; created_at: string }[];

  const needsAttentionItems = [
    ...newLeadsData.map(l => ({
      key: `lead-${l.id}`,
      emoji: "🎯",
      text: `New lead${l.full_name ? ` — ${l.full_name}` : ""}${l.source ? ` (${l.source})` : ""}`,
      href: `/app/leads/${l.id}`,
    })),
    ...sentQuotes.slice(0, 2).map(q => ({
      key: `quote-${q.id}`,
      emoji: "📄",
      text: "Quote awaiting response",
      href: `/app/quotes/${q.id}`,
    })),
    ...overdueInvoices.slice(0, 3).map(inv => ({
      key: `inv-${inv.id}`,
      emoji: "⚠️",
      text: `Overdue invoice — $${Number(inv.total_amount).toLocaleString()}`,
      href: `/app/invoices/${inv.id}`,
    })),
  ];
  const needsAttentionCount = needsAttentionItems.length;

  const recentActivity: { id: string; entity_type: string; entity_id: string; action: string; description: string | null; created_at: string }[] =
    (activityResult as any)?.data ?? [];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {greeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Here&apos;s what&apos;s happening today.</p>
        </div>
        <CreateNewButton />
      </div>

      <div className="px-4 space-y-4 pb-32">
        {!isDemo && <SetupChecklist orgId={orgId!} />}

        {/* ── 3 Stat Cards ── */}
        <div className="grid grid-cols-3 gap-3">
          {/* Jobs Today */}
          <Link href="/app/schedule" className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center text-center active:bg-gray-50">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: "#EFF6FF" }}>
              <svg className="w-5 h-5" style={{ color: "#2563EB" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeLinecap="round"/>
                <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round"/>
                <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round"/>
                <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-slate-800">{jobsTodayCount}</span>
            <span className="text-xs text-gray-500 mt-0.5 leading-tight">Jobs Today</span>
            <span className="text-[10px] font-semibold text-blue-600 mt-1.5 flex items-center gap-0.5">View schedule ›</span>
          </Link>

          {/* Quotes Awaiting */}
          <Link href={sentQuotesHref} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center text-center active:bg-gray-50">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: "#FFF7ED" }}>
              <svg className="w-5 h-5" style={{ color: "#F97316" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-slate-800">{estimatesCount}</span>
            <span className="text-xs text-gray-500 mt-0.5 leading-tight">Quotes Awaiting</span>
            <span className="text-[10px] font-semibold text-orange-500 mt-1.5 flex items-center gap-0.5">View quotes ›</span>
          </Link>

          {/* Outstanding */}
          <Link href="/app/invoices" className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center text-center active:bg-gray-50">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: "#F0FDF4" }}>
              <svg className="w-5 h-5" style={{ color: "#16A34A" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="12" y1="1" x2="12" y2="23" strokeLinecap="round"/>
                <path strokeLinecap="round" d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <span className={`text-xl font-bold ${unpaidTotal > 0 ? "text-slate-800" : "text-green-600"}`}>
              {unpaidTotal > 0 ? `$${unpaidTotal >= 1000 ? (unpaidTotal / 1000).toFixed(1) + "k" : unpaidTotal.toLocaleString()}` : "Clear"}
            </span>
            <span className="text-xs text-gray-500 mt-0.5 leading-tight">Outstanding</span>
            <span className="text-[10px] font-semibold text-green-600 mt-1.5 flex items-center gap-0.5">View invoices ›</span>
          </Link>
        </div>

        {/* ── Today's Schedule ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <h2 className="font-bold text-slate-800">Today&apos;s Schedule</h2>
            <Link href="/app/schedule" className="text-xs font-semibold text-blue-600">View all</Link>
          </div>
          {jobsTodayList.length === 0 ? (
            <div className="px-4 pb-5 text-center">
              <p className="text-3xl mb-2">📅</p>
              <p className="text-sm font-medium text-gray-500">No jobs scheduled today</p>
              <Link href="/app/jobs/new" className="mt-3 inline-block text-xs font-bold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: "#1B3A6B" }}>
                Schedule a Job
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {jobsTodayList.map(job => {
                const customerName = customerMap[job.customer_id] ?? "";
                const addrLine = [job.address, job.city, job.state].filter(Boolean).join(", ");
                return (
                  <Link key={job.id} href={`/app/jobs/${job.id}`}
                    className="flex items-center gap-3 px-4 py-3 active:bg-gray-50">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#EFF6FF" }}>
                      <span className="text-base">🔧</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{customerName || job.job_title}</p>
                      {addrLine && <p className="text-xs text-gray-400 truncate">{addrLine}</p>}
                      {customerName && <p className="text-[11px] text-gray-400 truncate">{job.job_title}</p>}
                    </div>
                    <span className="text-gray-300 text-sm shrink-0">›</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Needs Attention + Recent Activity ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Needs Attention */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <span className="font-bold text-sm text-slate-800">Needs Attention</span>
              {needsAttentionCount > 0 && (
                <span className="text-[10px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                  {needsAttentionCount > 9 ? "9+" : needsAttentionCount}
                </span>
              )}
            </div>
            {needsAttentionCount === 0 ? (
              <div className="px-3 pb-4 text-center">
                <p className="text-xs text-green-600 font-semibold">✓ All caught up</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {needsAttentionItems.slice(0, 4).map(item => (
                  <Link key={item.key} href={item.href}
                    className="flex items-start gap-2 px-3 py-2.5 active:bg-gray-50">
                    <span className="text-sm shrink-0 mt-0.5">{item.emoji}</span>
                    <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">{item.text}</p>
                  </Link>
                ))}
                {needsAttentionCount > 4 && (
                  <Link href="/app/leads" className="block px-3 py-2 text-[11px] font-semibold text-blue-600 text-center">
                    View all
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <span className="font-bold text-sm text-slate-800">Recent Activity</span>
              <Link href="/app/activity" className="text-[10px] font-semibold text-blue-600">View all</Link>
            </div>
            {recentActivity.length === 0 ? (
              <div className="px-3 pb-4 text-center">
                <p className="text-xs text-gray-400">No activity yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentActivity.map(log => {
                  const meta = ENTITY_META[log.entity_type];
                  const href = meta ? meta.href(log.entity_id) : "/app/activity";
                  const label = log.description ?? `${meta?.label ?? log.entity_type} ${log.action}`;
                  return (
                    <Link key={log.id} href={href}
                      className="flex items-start gap-2 px-3 py-2.5 active:bg-gray-50">
                      <span className="text-sm shrink-0 mt-0.5">{meta?.emoji ?? "📋"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">{label}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">{timeAgo(log.created_at)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── AI Job Capture ── */}
        <div className="bg-white rounded-2xl px-4 pt-4 pb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg leading-none">✨</span>
            <h2 className="text-sm font-bold text-slate-800">AI Job Capture</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">Describe the job. We&apos;ll build it fast.</p>
          <Suspense fallback={null}>
            <AiCaptureModal defaultWarrantyText={defaultWarrantyText} />
          </Suspense>
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
              ].map(step =>
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

      {/* ── Floating Actions ── */}
      <HomeFloatingActions />
    </div>
  );
}
