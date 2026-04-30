import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { toCSV, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmt2(n: number) {
  return Number(n).toFixed(2);
}

export async function GET(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "summary";
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const endTs = end ? end + "T23:59:59" : null;

  // ── helpers ──────────────────────────────────────────────────────────────
  function applyDateRange(query: any, col: string) {
    if (start) query = query.gte(col, start);
    if (endTs) query = query.lte(col, endTs);
    return query;
  }

  // ── SUMMARY (JSON) ────────────────────────────────────────────────────────
  if (type === "summary") {
    // Paid invoices = revenue
    let invQ = admin
      .from("invoices")
      .select("total_amount,tax_amount")
      .eq("org_id", orgId!)
      .eq("status", "paid");
    invQ = applyDateRange(invQ, "created_at");
    const { data: paidInvoices } = await invQ;

    // All invoices count for the period
    let allInvQ = admin
      .from("invoices")
      .select("id,status,total_amount")
      .eq("org_id", orgId!);
    allInvQ = applyDateRange(allInvQ, "created_at");
    const { data: allInvoices } = await allInvQ;

    // Expenses
    let expQ = admin
      .from("expenses")
      .select("total_amount")
      .eq("org_id", orgId!);
    expQ = applyDateRange(expQ, "receipt_date");
    const { data: expenses } = await expQ;

    // Payments (actual cash received)
    let payQ = admin
      .from("payments")
      .select("amount")
      .eq("org_id", orgId!);
    payQ = applyDateRange(payQ, "payment_date");
    const { data: payments } = await payQ;

    const revenue = (payments ?? []).reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
    const totalExpenses = (expenses ?? []).reduce((s: number, e: any) => s + Number(e.total_amount ?? 0), 0);
    const netProfit = revenue - totalExpenses;
    const invoicedTotal = (allInvoices ?? []).reduce((s: number, i: any) => s + Number(i.total_amount ?? 0), 0);
    const paidCount = (allInvoices ?? []).filter((i: any) => i.status === "paid").length;
    const unpaidTotal = (allInvoices ?? [])
      .filter((i: any) => i.status !== "paid" && i.status !== "draft")
      .reduce((s: number, i: any) => s + Number(i.total_amount ?? 0), 0);

    return NextResponse.json({
      revenue,
      expenses: totalExpenses,
      net_profit: netProfit,
      invoiced_total: invoicedTotal,
      paid_count: paidCount,
      invoice_count: (allInvoices ?? []).length,
      expense_count: (expenses ?? []).length,
      unpaid_total: unpaidTotal,
    });
  }

  // ── PROFIT & LOSS (CSV) ───────────────────────────────────────────────────
  if (type === "pl") {
    let payQ = admin.from("payments").select("amount,payment_date,payment_method").eq("org_id", orgId!);
    payQ = applyDateRange(payQ, "payment_date");
    const { data: payments } = await payQ;

    let expQ = admin.from("expenses").select("total_amount,tax_amount,vendor,receipt_date").eq("org_id", orgId!);
    expQ = applyDateRange(expQ, "receipt_date");
    const { data: expenses } = await expQ;

    const totalRevenue = (payments ?? []).reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
    const totalExpenses = (expenses ?? []).reduce((s: number, e: any) => s + Number(e.total_amount ?? 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    const rows = [
      { category: "REVENUE", description: "Payments Received", amount: fmt2(totalRevenue) },
      { category: "EXPENSES", description: "Total Expenses", amount: fmt2(totalExpenses) },
      { category: "NET PROFIT", description: "Revenue − Expenses", amount: fmt2(netProfit) },
      { category: "", description: "", amount: "" },
      { category: "--- REVENUE DETAIL ---", description: "", amount: "" },
      ...(payments ?? []).map((p: any) => ({
        category: "Revenue",
        description: `Payment (${p.payment_method ?? "unknown"})`,
        amount: fmt2(Number(p.amount ?? 0)),
      })),
      { category: "", description: "", amount: "" },
      { category: "--- EXPENSE DETAIL ---", description: "", amount: "" },
      ...(expenses ?? []).map((e: any) => ({
        category: "Expense",
        description: e.vendor ?? "Unknown",
        amount: fmt2(Number(e.total_amount ?? 0)),
      })),
    ];

    return csvResponse(toCSV(rows), `tradebase-pl-${today()}.csv`);
  }

  // ── EXPENSE CATEGORIES (CSV) ──────────────────────────────────────────────
  if (type === "expense-categories") {
    let q = admin
      .from("expenses")
      .select("vendor,total_amount,tax_amount,receipt_date,notes")
      .eq("org_id", orgId!);
    q = applyDateRange(q, "receipt_date");
    const { data: expenses } = await q;

    // Group by vendor as the closest we have to category
    const grouped: Record<string, { total: number; tax: number; count: number }> = {};
    for (const e of (expenses ?? []) as any[]) {
      const key = e.vendor ?? "Unknown";
      if (!grouped[key]) grouped[key] = { total: 0, tax: 0, count: 0 };
      grouped[key].total += Number(e.total_amount ?? 0);
      grouped[key].tax += Number(e.tax_amount ?? 0);
      grouped[key].count++;
    }

    const rows = Object.entries(grouped)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([vendor, vals]) => ({
        vendor,
        transaction_count: vals.count,
        subtotal: fmt2(vals.total - vals.tax),
        tax_paid: fmt2(vals.tax),
        total_spent: fmt2(vals.total),
      }));

    if (!rows.length) {
      rows.push({ vendor: "No expenses found", transaction_count: 0, subtotal: "0.00", tax_paid: "0.00", total_spent: "0.00" });
    }

    return csvResponse(toCSV(rows), `tradebase-expense-categories-${today()}.csv`);
  }

  // ── JOB PROFIT (CSV) ──────────────────────────────────────────────────────
  if (type === "job-profit") {
    // Fetch jobs
    const { data: jobs } = await admin
      .from("jobs")
      .select("id,job_title,status,scheduled_date,customers(first_name,last_name,company_name)")
      .eq("org_id", orgId!);

    // Fetch invoices with job_id
    const { data: invoices } = await admin
      .from("invoices")
      .select("id,job_id,total_amount,status")
      .eq("org_id", orgId!)
      .not("job_id", "is", null);

    // Fetch expenses with job_id
    let expQ = admin
      .from("expenses")
      .select("job_id,total_amount")
      .eq("org_id", orgId!)
      .not("job_id", "is", null);
    if (start) expQ = expQ.gte("receipt_date", start);
    if (endTs) expQ = expQ.lte("receipt_date", endTs);
    const { data: expenses } = await expQ;

    // Build maps
    const revenueByJob: Record<string, number> = {};
    const expenseByJob: Record<string, number> = {};

    for (const inv of (invoices ?? []) as any[]) {
      if (inv.job_id && (inv.status === "paid" || inv.status === "sent")) {
        revenueByJob[inv.job_id] = (revenueByJob[inv.job_id] ?? 0) + Number(inv.total_amount ?? 0);
      }
    }
    for (const exp of (expenses ?? []) as any[]) {
      if (exp.job_id) {
        expenseByJob[exp.job_id] = (expenseByJob[exp.job_id] ?? 0) + Number(exp.total_amount ?? 0);
      }
    }

    const rows = (jobs ?? []).map((j: any) => {
      const cust = j.customers as any;
      const clientName = cust
        ? ([cust.first_name, cust.last_name].filter(Boolean).join(" ") || cust.company_name || "")
        : "";
      const revenue = revenueByJob[j.id] ?? 0;
      const expenses = expenseByJob[j.id] ?? 0;
      return {
        job_title: j.job_title ?? "",
        client: clientName,
        status: j.status ?? "",
        scheduled_date: j.scheduled_date ?? "",
        revenue: fmt2(revenue),
        expenses: fmt2(expenses),
        net_profit: fmt2(revenue - expenses),
      };
    });

    return csvResponse(toCSV(rows), `tradebase-job-profit-${today()}.csv`);
  }

  // ── TAX SUMMARY (CSV) ─────────────────────────────────────────────────────
  if (type === "tax-summary") {
    // Tax collected on invoices
    let invQ = admin
      .from("invoices")
      .select("tax_amount,created_at,status,invoice_number")
      .eq("org_id", orgId!);
    invQ = applyDateRange(invQ, "created_at");
    const { data: invoices } = await invQ;

    // Tax paid on expenses
    let expQ = admin
      .from("expenses")
      .select("tax_amount,receipt_date,vendor")
      .eq("org_id", orgId!);
    expQ = applyDateRange(expQ, "receipt_date");
    const { data: expenses } = await expQ;

    const taxCollected = (invoices ?? []).reduce((s: number, i: any) => s + Number(i.tax_amount ?? 0), 0);
    const taxPaid = (expenses ?? []).reduce((s: number, e: any) => s + Number(e.tax_amount ?? 0), 0);
    const netTaxOwed = taxCollected - taxPaid;

    const rows = [
      { category: "SUMMARY", description: "Tax Collected (Invoices)", amount: fmt2(taxCollected) },
      { category: "SUMMARY", description: "Tax Paid (Expenses)", amount: fmt2(taxPaid) },
      { category: "SUMMARY", description: "Net Tax Owed", amount: fmt2(netTaxOwed) },
      { category: "", description: "", amount: "" },
      { category: "--- TAX COLLECTED ---", description: "", amount: "" },
      ...(invoices ?? []).map((i: any) => ({
        category: "Collected",
        description: i.invoice_number ?? `INV-${String(i.id ?? "").slice(0, 8).toUpperCase()}`,
        amount: fmt2(Number(i.tax_amount ?? 0)),
      })),
      { category: "", description: "", amount: "" },
      { category: "--- TAX PAID ---", description: "", amount: "" },
      ...(expenses ?? []).map((e: any) => ({
        category: "Paid",
        description: e.vendor ?? "Unknown",
        amount: fmt2(Number(e.tax_amount ?? 0)),
      })),
    ];

    return csvResponse(toCSV(rows), `tradebase-tax-summary-${today()}.csv`);
  }

  // ── REVENUE BY CLIENT (CSV) ───────────────────────────────────────────────
  if (type === "revenue-by-client") {
    let q = admin
      .from("payments")
      .select("amount,payment_date,invoices(customer_id,customers(id,first_name,last_name,company_name))")
      .eq("org_id", orgId!);
    q = applyDateRange(q, "payment_date");
    const { data: payments } = await q;

    const byClient: Record<string, { name: string; total: number; count: number }> = {};

    for (const p of (payments ?? []) as any[]) {
      const inv = p.invoices as any;
      const cust = inv?.customers as any;
      const clientId = cust?.id ?? "unknown";
      const clientName = cust
        ? ([cust.first_name, cust.last_name].filter(Boolean).join(" ") || cust.company_name || "Unknown")
        : "Unknown";
      if (!byClient[clientId]) byClient[clientId] = { name: clientName, total: 0, count: 0 };
      byClient[clientId].total += Number(p.amount ?? 0);
      byClient[clientId].count++;
    }

    const rows = Object.values(byClient)
      .sort((a, b) => b.total - a.total)
      .map((c) => ({
        client_name: c.name,
        payment_count: c.count,
        total_revenue: fmt2(c.total),
      }));

    if (!rows.length) {
      rows.push({ client_name: "No payments found", payment_count: 0, total_revenue: "0.00" });
    }

    return csvResponse(toCSV(rows), `tradebase-revenue-by-client-${today()}.csv`);
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
