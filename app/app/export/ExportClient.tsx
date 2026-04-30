"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type ExportType = {
  key: string;
  label: string;
  emoji: string;
  endpoint: string;
  hasStatus?: boolean;
  statusOptions?: string[];
  description: string;
  fields: string;
  pdfEndpoint?: string;
};

type Summary = {
  revenue: number;
  expenses: number;
  net_profit: number;
  invoiced_total: number;
  paid_count: number;
  invoice_count: number;
  expense_count: number;
  unpaid_total: number;
};

// ── Static data ───────────────────────────────────────────────────────────────

const EXPORTS: ExportType[] = [
  {
    key: "clients",
    label: "Clients",
    emoji: "👤",
    endpoint: "/api/export/clients",
    description: "All customer contacts",
    fields: "Name · Company · Phone · Email · Address",
  },
  {
    key: "invoices",
    label: "Invoices",
    emoji: "🧾",
    endpoint: "/api/export/invoices",
    pdfEndpoint: "/api/export/pdf?type=invoices",
    hasStatus: true,
    statusOptions: ["all", "draft", "sent", "paid", "overdue"],
    description: "Invoice records with totals",
    fields: "Invoice # · Client · Date · Due Date · Status · Subtotal · Tax · Total",
  },
  {
    key: "payments",
    label: "Payments",
    emoji: "💳",
    endpoint: "/api/export/payments",
    description: "All recorded payments",
    fields: "Date · Amount · Method · Invoice # · Client",
  },
  {
    key: "line-items",
    label: "Services / Line Items",
    emoji: "📋",
    endpoint: "/api/export/line-items",
    description: "Individual invoice line items",
    fields: "Description · Qty · Unit Price · Amount · Invoice # · Client",
  },
];

type ReportCard = {
  key: string;
  label: string;
  emoji: string;
  description: string;
  endpoint: string;
};

const REPORTS: ReportCard[] = [
  {
    key: "pl",
    label: "Profit & Loss",
    emoji: "📊",
    description: "Revenue vs expenses with net profit",
    endpoint: "/api/reports?type=pl",
  },
  {
    key: "expense-categories",
    label: "Expense Summary",
    emoji: "🧾",
    description: "Spending totals grouped by vendor",
    endpoint: "/api/reports?type=expense-categories",
  },
  {
    key: "job-profit",
    label: "Job Profit",
    emoji: "🔧",
    description: "Revenue minus expenses per job",
    endpoint: "/api/reports?type=job-profit",
  },
  {
    key: "tax-summary",
    label: "Tax Summary",
    emoji: "🏦",
    description: "Tax collected vs tax paid for the period",
    endpoint: "/api/reports?type=tax-summary",
  },
  {
    key: "revenue-by-client",
    label: "Revenue by Client",
    emoji: "👤",
    description: "Total payments received per client",
    endpoint: "/api/reports?type=revenue-by-client",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryHeader({ summary, loading }: { summary: Summary | null; loading: boolean }) {
  const metrics = [
    {
      label: "Revenue",
      value: summary ? fmtMoney(summary.revenue) : "—",
      sub: summary ? `${summary.paid_count} paid invoices` : "",
      color: "#16a34a",
      bg: "#f0fdf4",
    },
    {
      label: "Expenses",
      value: summary ? fmtMoney(summary.expenses) : "—",
      sub: summary ? `${summary.expense_count} receipts` : "",
      color: "#dc2626",
      bg: "#fef2f2",
    },
    {
      label: "Net Profit",
      value: summary ? fmtMoney(summary.net_profit) : "—",
      sub: summary && summary.net_profit >= 0 ? "Profitable" : summary ? "Operating at a loss" : "",
      color: summary && summary.net_profit < 0 ? "#dc2626" : "#1B3A6B",
      bg: summary && summary.net_profit < 0 ? "#fef2f2" : "#eff6ff",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-2xl p-3 text-center"
          style={{ backgroundColor: m.bg }}>
          {loading ? (
            <div className="animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mx-auto mb-1" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mx-auto" />
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 font-medium mb-0.5">{m.label}</p>
              <p className="text-base font-bold leading-tight" style={{ color: m.color }}>
                {m.value}
              </p>
              {m.sub && <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{m.sub}</p>}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 pt-1">{children}</p>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ExportClient() {
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [statuses, setStatuses] = useState<Record<string, string>>({ invoices: "all" });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const QUICK_RANGES = [
    { label: "This Year", start: `${currentYear}-01-01`, end: new Date().toISOString().slice(0, 10) },
    { label: "Last Year", start: `${currentYear - 1}-01-01`, end: `${currentYear - 1}-12-31` },
    {
      label: "This Month",
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
      end: new Date().toISOString().slice(0, 10),
    },
    {
      label: "Last 90 Days",
      start: new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10),
      end: new Date().toISOString().slice(0, 10),
    },
  ];

  const fetchSummary = useCallback(async (start: string, end: string) => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/reports?type=summary&start=${start}&end=${end}`);
      if (res.ok) {
        const data = await res.json() as Summary;
        setSummary(data);
      }
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary(startDate, endDate);
  }, [startDate, endDate, fetchSummary]);

  function buildUrl(endpoint: string, statusKey?: string) {
    const params = new URLSearchParams();
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    if (statusKey && statuses[statusKey]) params.set("status", statuses[statusKey]);
    const sep = endpoint.includes("?") ? "&" : "?";
    return `${endpoint}${sep}${params.toString()}`;
  }

  function openInTab(endpoint: string, statusKey?: string) {
    window.open(buildUrl(endpoint, statusKey), "_blank", "noopener");
  }

  function applyRange(r: (typeof QUICK_RANGES)[0]) {
    setStartDate(r.start);
    setEndDate(r.end);
  }

  return (
    <div className="space-y-5">

      {/* ── Date Range ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-slate-700">Date Range</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => applyRange(r)}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-slate-600 font-medium active:bg-blue-50 active:text-[#1B3A6B]">
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary Header ─────────────────────────────────────────── */}
      <SummaryHeader summary={summary} loading={summaryLoading} />

      {summary && (
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
          <div className="text-center">
            <p className="text-[10px] text-gray-400">Invoiced</p>
            <p className="text-sm font-bold text-slate-700">{fmtMoney(summary.invoiced_total)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400">Unpaid / Outstanding</p>
            <p className="text-sm font-bold text-amber-600">{fmtMoney(summary.unpaid_total)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400">Total Invoices</p>
            <p className="text-sm font-bold text-slate-700">{summary.invoice_count}</p>
          </div>
        </div>
      )}

      {/* ── Business Reports ───────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionLabel>Business Reports</SectionLabel>
        {REPORTS.map((r) => (
          <div key={r.key} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: "#1B3A6B12" }}>
                  {r.emoji}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{r.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openInTab(r.endpoint)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ backgroundColor: "#1B3A6B12", color: "#1B3A6B" }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── PDF Receipts ───────────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionLabel>PDF Documents</SectionLabel>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: "#16a34a18" }}>
                🧾
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-sm">Receipts PDF</p>
                <p className="text-xs text-gray-400 mt-0.5">Paid invoices · one receipt per page · PAID stamp</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openInTab("/api/export/pdf?type=receipts")}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white"
              style={{ backgroundColor: "#16a34a" }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              PDF
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: "#1B3A6B12" }}>
                📄
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-sm">Invoice Summary PDF</p>
                <p className="text-xs text-gray-400 mt-0.5">All invoices as a formatted summary table</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openInTab("/api/export/pdf?type=invoices", "invoices")}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ backgroundColor: "#e8ecf2", color: "#0f1f3d" }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Detailed CSV Data ──────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionLabel>Detailed Data (CSV)</SectionLabel>
        {EXPORTS.map((ex) => (
          <div key={ex.key} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: "#1B3A6B12" }}>
                  {ex.emoji}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{ex.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ex.description}</p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{ex.fields}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openInTab(ex.endpoint, ex.hasStatus ? ex.key : undefined)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ backgroundColor: "#1B3A6B" }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                CSV
              </button>
            </div>
            {ex.hasStatus && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 font-medium">Status:</span>
                  {(ex.statusOptions ?? []).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatuses((prev) => ({ ...prev, [ex.key]: s }))}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium capitalize transition-colors ${
                        (statuses[ex.key] ?? "all") === s ? "text-white" : "bg-gray-100 text-slate-500"
                      }`}
                      style={(statuses[ex.key] ?? "all") === s ? { backgroundColor: "#1B3A6B" } : {}}>
                      {s === "all" ? "All" : s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── QuickBooks note ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-center">
        <p className="text-sm font-semibold text-slate-600">QuickBooks Online Sync</p>
        <p className="text-xs text-gray-400 mt-1">
          Direct sync coming in a future update. Import CSVs via QuickBooks → File → Import → Customers or Transactions.
        </p>
      </div>
    </div>
  );
}
