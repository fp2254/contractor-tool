import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

export type OpsTask = {
  id: string;
  priority: number;
  icon: string;
  text: string;
  href: string;
  category: string;
};

export type OpsCategory = {
  key: string;
  label: string;
  cleared: boolean;
};

export type OpsResponse = {
  tasks: OpsTask[];
  categories: OpsCategory[];
  summary: string;
  totalTasks: number;
};

function customerName(c: { first_name?: string; last_name?: string; company_name?: string } | null): string {
  if (!c) return "Unknown";
  const full = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return full || c.company_name || "Unknown";
}

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export async function GET() {
  try {
    const admin = createAdminClient();
    const supabase = await createClient();
    const { data: userResp } = await supabase.auth.getUser();
    if (!userResp.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await ensureUserOrg();
    if (!orgId) return NextResponse.json({ error: "No org" }, { status: 400 });

    const today = new Date().toISOString().slice(0, 10);
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();

    const [
      invoicesRes,
      jobsRes,
      quotesRes,
      leadsRes,
      customersRes,
      notesRes,
    ] = await Promise.all([
      admin
        .from("invoices")
        .select("id,status,total_amount,due_date,customer_id")
        .eq("org_id", orgId)
        .in("status", ["overdue", "unpaid"]),
      admin
        .from("jobs")
        .select("id,job_title,address,status,scheduled_date,customer_id,invoice_id")
        .eq("org_id", orgId)
        .not("status", "eq", "cancelled"),
      admin
        .from("quotes")
        .select("id,status,total_amount,created_at,customer_id")
        .eq("org_id", orgId)
        .eq("status", "sent")
        .lt("created_at", threeDaysAgo),
      admin
        .from("leads")
        .select("id,first_name,last_name,status,created_at")
        .eq("org_id", orgId)
        .eq("status", "new")
        .lt("created_at", twoDaysAgo),
      admin
        .from("customers")
        .select("id,first_name,last_name,company_name")
        .eq("org_id", orgId),
      admin
        .from("notes")
        .select("job_id")
        .eq("org_id", orgId)
        .not("job_id", "is", null),
    ]);

    const customerMap = new Map(
      (customersRes.data ?? []).map((c) => [c.id, c])
    );

    const jobsWithNotes = new Set(
      (notesRes.data ?? [])
        .map((n) => (n as { job_id: string }).job_id)
        .filter(Boolean)
    );

    const tasks: OpsTask[] = [];

    // ── P1: Overdue invoices ────────────────────────────────────────────
    const overdueInvoices = (invoicesRes.data ?? []).filter(
      (i) => i.status === "overdue"
    );
    for (const inv of overdueInvoices) {
      const name = customerName(customerMap.get(inv.customer_id) ?? null);
      tasks.push({
        id: `inv-${inv.id}`,
        priority: 1,
        icon: "🔴",
        text: `Invoice $${Number(inv.total_amount).toLocaleString()} overdue — ${name}`,
        href: `/app/invoices/${inv.id}`,
        category: "overdue_invoices",
      });
    }

    // ── P2: Completed jobs missing invoice ─────────────────────────────
    const completedNoInvoice = (jobsRes.data ?? []).filter(
      (j) => j.status === "completed" && !j.invoice_id
    );
    for (const job of completedNoInvoice) {
      const label = job.job_title || job.address || "Job";
      tasks.push({
        id: `job-inv-${job.id}`,
        priority: 2,
        icon: "📄",
        text: `Create invoice for ${label}`,
        href: `/app/jobs/${job.id}`,
        category: "missing_invoices",
      });
    }

    // ── P3: Quotes needing follow-up ───────────────────────────────────
    for (const quote of quotesRes.data ?? []) {
      const name = customerName(customerMap.get(quote.customer_id) ?? null);
      const days = daysAgo(quote.created_at);
      tasks.push({
        id: `quote-${quote.id}`,
        priority: 3,
        icon: "📋",
        text: `Follow up with ${name} — quote sent ${days} day${days !== 1 ? "s" : ""} ago`,
        href: `/app/quotes/${quote.id}`,
        category: "quote_followup",
      });
    }

    // ── P4: Jobs due today ─────────────────────────────────────────────
    const todayJobs = (jobsRes.data ?? []).filter(
      (j) =>
        j.scheduled_date === today &&
        (j.status === "scheduled" || j.status === "pending" || j.status === "in_progress")
    );
    for (const job of todayJobs) {
      const label = job.job_title || job.address || "Job";
      tasks.push({
        id: `today-${job.id}`,
        priority: 4,
        icon: "📅",
        text: `Job today: ${label}`,
        href: `/app/jobs/${job.id}`,
        category: "jobs_today",
      });
    }

    // ── P5: Unscheduled jobs ───────────────────────────────────────────
    const unscheduled = (jobsRes.data ?? []).filter(
      (j) =>
        !j.scheduled_date &&
        j.status !== "completed" &&
        j.status !== "cancelled"
    );
    for (const job of unscheduled) {
      const label = job.job_title || job.address || "Job";
      tasks.push({
        id: `unsched-${job.id}`,
        priority: 5,
        icon: "📆",
        text: `Schedule: ${label}`,
        href: `/app/jobs/${job.id}`,
        category: "unscheduled",
      });
    }

    // ── P6: Leads not contacted ────────────────────────────────────────
    for (const lead of leadsRes.data ?? []) {
      const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "New Lead";
      const days = daysAgo(lead.created_at);
      tasks.push({
        id: `lead-${lead.id}`,
        priority: 6,
        icon: "👤",
        text: `New lead not contacted: ${name} (${days}d ago)`,
        href: `/app/leads`,
        category: "leads",
      });
    }

    // ── P7: Completed jobs missing notes ───────────────────────────────
    const completedNoNotes = (jobsRes.data ?? []).filter(
      (j) => j.status === "completed" && !jobsWithNotes.has(j.id)
    );
    for (const job of completedNoNotes) {
      if (job.invoice_id) {
        // only flag if invoice exists (avoid double-penalizing)
        const label = job.job_title || job.address || "Job";
        tasks.push({
          id: `notes-${job.id}`,
          priority: 7,
          icon: "📝",
          text: `Add notes to completed job: ${label}`,
          href: `/app/jobs/${job.id}`,
          category: "missing_docs",
        });
      }
    }

    tasks.sort((a, b) => a.priority - b.priority);

    // ── Category summary for progress bar ─────────────────────────────
    const categories: OpsCategory[] = [
      { key: "overdue_invoices", label: "Overdue invoices", cleared: overdueInvoices.length === 0 },
      { key: "missing_invoices", label: "Jobs need invoicing", cleared: completedNoInvoice.length === 0 },
      { key: "quote_followup", label: "Quote follow-ups", cleared: (quotesRes.data ?? []).length === 0 },
      { key: "jobs_today", label: "Jobs today", cleared: todayJobs.length === 0 },
      { key: "unscheduled", label: "Unscheduled jobs", cleared: unscheduled.length === 0 },
      { key: "leads", label: "New leads", cleared: (leadsRes.data ?? []).length === 0 },
      { key: "missing_docs", label: "Job documentation", cleared: completedNoNotes.filter(j => j.invoice_id).length === 0 },
    ];

    // ── Smart summary ──────────────────────────────────────────────────
    const cleared = categories.filter((c) => c.cleared).length;
    let summary = "";
    if (tasks.length === 0) {
      summary = "Ops board clear — you're on top of everything today.";
    } else if (overdueInvoices.length > 0) {
      const total = overdueInvoices.reduce((s, i) => s + Number(i.total_amount), 0);
      summary = `$${total.toLocaleString()} in overdue invoices — collect payment first.`;
    } else if (completedNoInvoice.length > 0) {
      summary = `${completedNoInvoice.length} completed job${completedNoInvoice.length > 1 ? "s" : ""} still need${completedNoInvoice.length === 1 ? "s" : ""} an invoice.`;
    } else if ((quotesRes.data ?? []).length > 0) {
      summary = `${quotesRes.data!.length} quote${quotesRes.data!.length > 1 ? "s" : ""} waiting on a response — follow up today.`;
    } else if (unscheduled.length > 0) {
      summary = `${unscheduled.length} job${unscheduled.length > 1 ? "s" : ""} not yet scheduled.`;
    } else {
      summary = `${cleared} of ${categories.length} categories clear today.`;
    }

    return NextResponse.json({
      tasks,
      categories,
      summary,
      totalTasks: tasks.length,
    } satisfies OpsResponse);
  } catch (err) {
    console.error("Ops API error:", err);
    return NextResponse.json({ error: "Failed to load ops data" }, { status: 500 });
  }
}
