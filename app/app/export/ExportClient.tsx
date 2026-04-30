"use client";

import { useState } from "react";

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

export default function ExportClient() {
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [statuses, setStatuses] = useState<Record<string, string>>({ invoices: "all" });
  const [downloading, setDownloading] = useState<string | null>(null);

  function buildUrl(endpoint: string, key?: string) {
    const params = new URLSearchParams();
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    if (key && statuses[key]) params.set("status", statuses[key]);
    const sep = endpoint.includes("?") ? "&" : "?";
    return `${endpoint}${sep}${params.toString()}`;
  }

  function triggerDownload(blob: Blob, filename: string) {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    }, 150);
  }

  async function handleDownload(ex: ExportType) {
    setDownloading(ex.key);
    try {
      const url = buildUrl(ex.endpoint, ex.hasStatus ? ex.key : undefined);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="?([^"]+)"?/);
      triggerDownload(blob, match?.[1] ?? `tradebase-${ex.key}.csv`);
    } catch (err: any) {
      alert(err?.message ?? "Download failed — please try again.");
    } finally {
      setDownloading(null);
    }
  }

  async function handlePdfDownload(key: string, endpoint: string) {
    setDownloading(`pdf-${key}`);
    try {
      const url = buildUrl(endpoint, key === "invoices" ? "invoices" : undefined);
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`PDF generation failed (${res.status})${text ? ": " + text.slice(0, 120) : ""}`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="?([^"]+)"?/);
      triggerDownload(blob, match?.[1] ?? `tradebase-${key}.pdf`);
    } catch (err: any) {
      alert(err?.message ?? "PDF download failed — please try again.");
    } finally {
      setDownloading(null);
    }
  }

  const QUICK_RANGES = [
    { label: "This Year", start: `${currentYear}-01-01`, end: new Date().toISOString().slice(0, 10) },
    { label: "Last Year", start: `${currentYear - 1}-01-01`, end: `${currentYear - 1}-12-31` },
    { label: "This Month", start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) },
    { label: "Last 90 Days", start: new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Date Range</p>
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
          <div className="flex flex-wrap gap-2 mt-2">
            {QUICK_RANGES.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => { setStartDate(r.start); setEndDate(r.end); }}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-slate-600 font-medium active:bg-blue-50 active:text-[#1B3A6B]">
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Receipts PDF — always-visible shortcut */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: "#16a34a18" }}>
                🧾
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-sm">Receipts PDF</p>
                <p className="text-xs text-gray-500 mt-0.5">All paid invoices as individual receipts</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">One receipt per page · Line items · PAID stamp</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handlePdfDownload("receipts", "/api/export/pdf?type=receipts")}
              disabled={downloading === "pdf-receipts"}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: "#16a34a" }}>
              {downloading === "pdf-receipts" ? (
                <span className="animate-pulse">…</span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  PDF
                </>
              )}
            </button>
          </div>
        </div>

        {EXPORTS.map((ex) => (
          <div key={ex.key} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: "#1B3A6B15" }}>
                  {ex.emoji}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{ex.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ex.description}</p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{ex.fields}</p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(ex)}
                  disabled={!!downloading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#1B3A6B" }}>
                  {downloading === ex.key ? (
                    <span className="animate-pulse">…</span>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      CSV
                    </>
                  )}
                </button>
                {ex.pdfEndpoint && (
                  <button
                    type="button"
                    onClick={() => handlePdfDownload(ex.key, ex.pdfEndpoint!)}
                    disabled={!!downloading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                    style={{ backgroundColor: "#e8ecf2", color: "#0f1f3d" }}>
                    {downloading === `pdf-${ex.key}` ? (
                      <span className="animate-pulse">…</span>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                        </svg>
                        PDF
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            {ex.hasStatus && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Status:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(ex.statusOptions ?? []).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatuses((prev) => ({ ...prev, [ex.key]: s }))}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium capitalize transition-colors ${
                          (statuses[ex.key] ?? "all") === s
                            ? "text-white"
                            : "bg-gray-100 text-slate-500"
                        }`}
                        style={(statuses[ex.key] ?? "all") === s ? { backgroundColor: "#1B3A6B" } : {}}>
                        {s === "all" ? "All" : s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-center">
        <p className="text-sm font-semibold text-slate-600">QuickBooks Online Sync</p>
        <p className="text-xs text-gray-400 mt-1">Direct sync coming in a future update. Import the CSV using QuickBooks → File → Import → Customers or Transactions.</p>
      </div>
    </div>
  );
}
