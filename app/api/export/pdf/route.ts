import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

export const dynamic = "force-dynamic";

// ─── Styles ─────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a2035" },
  // Header
  header: { marginBottom: 24 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  companyName: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#0f1f3d" },
  docTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#0f1f3d", textAlign: "right" },
  dateRange: { fontSize: 8.5, color: "#8a9ab5", marginTop: 2 },
  // Table
  tableHeader: { flexDirection: "row", backgroundColor: "#0f1f3d", padding: "7 10", borderRadius: 4, marginBottom: 2 },
  tableHeaderCell: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#ffffff", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", padding: "6 10", borderBottomWidth: 1, borderBottomColor: "#e8ecf2" },
  tableRowAlt: { flexDirection: "row", padding: "6 10", backgroundColor: "#f8f9fa", borderBottomWidth: 1, borderBottomColor: "#e8ecf2" },
  // Receipt
  receiptPage: { padding: 48, fontSize: 10, fontFamily: "Helvetica", color: "#1a2035" },
  receiptHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  receiptTitle: { fontSize: 26, fontFamily: "Helvetica-Bold", color: "#0f1f3d" },
  receiptMeta: { marginBottom: 24, flexDirection: "row", justifyContent: "space-between" },
  receiptMetaBlock: { width: "48%" },
  receiptLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#8a9ab5", textTransform: "uppercase", marginBottom: 3 },
  receiptValue: { fontSize: 10, color: "#1a2035" },
  lineHeader: { flexDirection: "row", backgroundColor: "#f4f5f7", padding: "5 8", marginBottom: 2 },
  lineRow: { flexDirection: "row", padding: "6 8", borderBottomWidth: 1, borderBottomColor: "#e8ecf2" },
  paidStamp: { marginTop: 28, borderWidth: 3, borderColor: "#16a34a", borderRadius: 6, padding: "6 14", alignSelf: "flex-start" },
  paidText: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#16a34a", textTransform: "uppercase", letterSpacing: 2 },
  totalsBlock: { marginTop: 16, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", gap: 0, marginBottom: 3 },
  totalLabel: { width: 100, fontSize: 9, color: "#8a9ab5", textAlign: "right", marginRight: 12 },
  totalValue: { width: 80, fontSize: 9, textAlign: "right" },
  grandLabel: { width: 100, fontFamily: "Helvetica-Bold", fontSize: 11, color: "#0f1f3d", textAlign: "right", marginRight: 12 },
  grandValue: { width: 80, fontFamily: "Helvetica-Bold", fontSize: 11, textAlign: "right" },
  footer: { position: "absolute", bottom: 32, left: 40, right: 40, borderTopWidth: 1, borderTopColor: "#e8ecf2", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7.5, color: "#b0b8c9" },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(n: number | string) {
  return `$${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function clientName(cust: Record<string, unknown> | null) {
  if (!cust) return "—";
  return (
    [cust.first_name, cust.last_name].filter(Boolean).join(" ") ||
    (cust.company_name as string) ||
    "—"
  );
}

function invoiceNum(inv: Record<string, unknown>) {
  return (inv.invoice_number as string) ?? `INV-${String(inv.id).slice(0, 8).toUpperCase()}`;
}

// ─── Invoice Summary PDF ─────────────────────────────────────────────────────

function InvoiceSummaryPDF({
  invoices,
  orgName,
  startDate,
  endDate,
}: {
  invoices: Record<string, unknown>[];
  orgName: string;
  startDate: string;
  endDate: string;
}) {
  const grandTotal = invoices.reduce((s, i) => s + Number(i.total_amount ?? 0), 0);

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: S.page },
      // Header
      React.createElement(
        View,
        { style: S.header },
        React.createElement(
          View,
          { style: S.headerRow },
          React.createElement(
            View,
            null,
            React.createElement(Text, { style: S.companyName }, orgName),
            React.createElement(Text, { style: S.dateRange }, `Invoices · ${fmtDate(startDate)} – ${fmtDate(endDate)}`),
          ),
          React.createElement(Text, { style: S.docTitle }, "INVOICES"),
        ),
      ),
      // Table header
      React.createElement(
        View,
        { style: S.tableHeader },
        React.createElement(Text, { style: [S.tableHeaderCell, { width: "18%" }] }, "Invoice #"),
        React.createElement(Text, { style: [S.tableHeaderCell, { width: "26%" }] }, "Client"),
        React.createElement(Text, { style: [S.tableHeaderCell, { width: "14%" }] }, "Date"),
        React.createElement(Text, { style: [S.tableHeaderCell, { width: "14%" }] }, "Due Date"),
        React.createElement(Text, { style: [S.tableHeaderCell, { width: "12%" }] }, "Status"),
        React.createElement(Text, { style: [S.tableHeaderCell, { width: "16%", textAlign: "right" }] }, "Total"),
      ),
      // Rows
      ...invoices.map((inv, i) => {
        const cust = inv.customers as Record<string, unknown> | null;
        const total = Number(inv.total_amount ?? 0);
        const rowStyle = i % 2 === 0 ? S.tableRow : S.tableRowAlt;
        return React.createElement(
          View,
          { key: String(inv.id), style: rowStyle },
          React.createElement(Text, { style: { width: "18%", fontSize: 9 } }, invoiceNum(inv)),
          React.createElement(Text, { style: { width: "26%", fontSize: 9 } }, clientName(cust)),
          React.createElement(Text, { style: { width: "14%", fontSize: 9 } }, fmtDate(inv.created_at as string)),
          React.createElement(Text, { style: { width: "14%", fontSize: 9 } }, fmtDate(inv.due_date as string)),
          React.createElement(Text, { style: { width: "12%", fontSize: 9, textTransform: "capitalize" } }, String(inv.status ?? "")),
          React.createElement(Text, { style: { width: "16%", fontSize: 9, textAlign: "right" } }, fmtMoney(total)),
        );
      }),
      // Grand total
      React.createElement(
        View,
        { style: { marginTop: 14, flexDirection: "row", justifyContent: "flex-end", borderTopWidth: 1.5, borderTopColor: "#0f1f3d", paddingTop: 8 } },
        React.createElement(Text, { style: { fontFamily: "Helvetica-Bold", fontSize: 11, marginRight: 8, color: "#0f1f3d" } }, "GRAND TOTAL"),
        React.createElement(Text, { style: { fontFamily: "Helvetica-Bold", fontSize: 11, color: "#0f1f3d", width: 80, textAlign: "right" } }, fmtMoney(grandTotal)),
      ),
      // Footer
      React.createElement(
        View,
        { style: S.footer },
        React.createElement(Text, { style: S.footerText }, `Generated ${fmtDate(new Date().toISOString())} · ${orgName}`),
        React.createElement(Text, { style: S.footerText }, "Powered by TradeBase"),
      ),
    ),
  );
}

// ─── Receipts PDF (one receipt per page) ─────────────────────────────────────

type LineItem = { description: string; quantity: number; unit_price: number; total_price: number };

function ReceiptsPDF({
  invoices,
  lineItemsMap,
  orgName,
}: {
  invoices: Record<string, unknown>[];
  lineItemsMap: Record<string, LineItem[]>;
  orgName: string;
}) {
  return React.createElement(
    Document,
    null,
    ...invoices.map((inv) => {
      const cust = inv.customers as Record<string, unknown> | null;
      const lines = lineItemsMap[String(inv.id)] ?? [];
      const total = Number(inv.total_amount ?? 0);
      const tax = Number(inv.tax_amount ?? 0);
      const subtotal = +(total - tax).toFixed(2);
      const isPaid = inv.status === "paid";

      return React.createElement(
        Page,
        { key: String(inv.id), size: "A4", style: S.receiptPage },
        // Header
        React.createElement(
          View,
          { style: S.receiptHeader },
          React.createElement(
            View,
            null,
            React.createElement(Text, { style: S.receiptTitle }, isPaid ? "RECEIPT" : "INVOICE"),
            React.createElement(Text, { style: { fontSize: 9, color: "#8a9ab5", marginTop: 3 } }, invoiceNum(inv)),
          ),
          React.createElement(
            View,
            { style: { textAlign: "right" } },
            React.createElement(Text, { style: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#0f1f3d" } }, orgName),
          ),
        ),
        // Meta
        React.createElement(
          View,
          { style: S.receiptMeta },
          React.createElement(
            View,
            { style: S.receiptMetaBlock },
            React.createElement(Text, { style: S.receiptLabel }, "Bill To"),
            React.createElement(Text, { style: S.receiptValue }, clientName(cust)),
          ),
          React.createElement(
            View,
            { style: { width: "48%", textAlign: "right" } },
            React.createElement(Text, { style: [S.receiptLabel, { textAlign: "right" }] }, "Date"),
            React.createElement(Text, { style: [S.receiptValue, { textAlign: "right" }] }, fmtDate(inv.created_at as string)),
            React.createElement(Text, { style: [S.receiptLabel, { textAlign: "right", marginTop: 6 }] }, "Due Date"),
            React.createElement(Text, { style: [S.receiptValue, { textAlign: "right" }] }, fmtDate(inv.due_date as string)),
          ),
        ),
        // Line items header
        React.createElement(
          View,
          { style: S.lineHeader },
          React.createElement(Text, { style: { width: "46%", fontSize: 8, fontFamily: "Helvetica-Bold", color: "#8a9ab5" } }, "DESCRIPTION"),
          React.createElement(Text, { style: { width: "14%", fontSize: 8, fontFamily: "Helvetica-Bold", color: "#8a9ab5", textAlign: "right" } }, "QTY"),
          React.createElement(Text, { style: { width: "20%", fontSize: 8, fontFamily: "Helvetica-Bold", color: "#8a9ab5", textAlign: "right" } }, "UNIT PRICE"),
          React.createElement(Text, { style: { width: "20%", fontSize: 8, fontFamily: "Helvetica-Bold", color: "#8a9ab5", textAlign: "right" } }, "AMOUNT"),
        ),
        // Line items
        ...(lines.length > 0
          ? lines.map((line, i) =>
              React.createElement(
                View,
                { key: i, style: S.lineRow },
                React.createElement(Text, { style: { width: "46%", fontSize: 9.5 } }, line.description ?? ""),
                React.createElement(Text, { style: { width: "14%", fontSize: 9.5, textAlign: "right" } }, String(line.quantity ?? 1)),
                React.createElement(Text, { style: { width: "20%", fontSize: 9.5, textAlign: "right" } }, fmtMoney(line.unit_price)),
                React.createElement(Text, { style: { width: "20%", fontSize: 9.5, textAlign: "right" } }, fmtMoney(line.total_price ?? (line.quantity * line.unit_price))),
              ),
            )
          : [
              React.createElement(
                View,
                { key: "empty", style: S.lineRow },
                React.createElement(Text, { style: { fontSize: 9, color: "#8a9ab5" } }, "No line items recorded"),
              ),
            ]),
        // Totals
        React.createElement(
          View,
          { style: S.totalsBlock },
          React.createElement(
            View,
            { style: S.totalRow },
            React.createElement(Text, { style: S.totalLabel }, "Subtotal"),
            React.createElement(Text, { style: S.totalValue }, fmtMoney(subtotal)),
          ),
          tax > 0 &&
            React.createElement(
              View,
              { style: S.totalRow },
              React.createElement(Text, { style: S.totalLabel }, "Tax"),
              React.createElement(Text, { style: S.totalValue }, fmtMoney(tax)),
            ),
          React.createElement(
            View,
            { style: [S.totalRow, { marginTop: 6, borderTopWidth: 1, borderTopColor: "#e8ecf2", paddingTop: 6 }] },
            React.createElement(Text, { style: S.grandLabel }, "Total"),
            React.createElement(Text, { style: S.grandValue }, fmtMoney(total)),
          ),
        ),
        // Paid stamp
        isPaid &&
          React.createElement(
            View,
            { style: S.paidStamp },
            React.createElement(Text, { style: S.paidText }, "PAID"),
          ),
        // Footer
        React.createElement(
          View,
          { style: S.footer },
          React.createElement(Text, { style: S.footerText }, orgName),
          React.createElement(Text, { style: S.footerText }, "Powered by TradeBase"),
        ),
      );
    }),
  );
}

// ─── Tax Summary PDF ──────────────────────────────────────────────────────────

function TaxSummaryPDF({
  invoices,
  expenses,
  orgName,
  startDate,
  endDate,
}: {
  invoices: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  orgName: string;
  startDate: string;
  endDate: string;
}) {
  const taxCollected = invoices.reduce((s, i) => s + Number(i.tax_amount ?? 0), 0);
  const taxPaid = expenses.reduce((s, e) => s + Number(e.tax_amount ?? 0), 0);
  const netOwed = taxCollected - taxPaid;

  const summaryRow = (label: string, value: string, bold = false, accent = false) =>
    React.createElement(
      View,
      { style: { flexDirection: "row", justifyContent: "space-between", padding: "7 10", borderBottomWidth: 1, borderBottomColor: "#e8ecf2", backgroundColor: bold ? "#f0f4ff" : "transparent" } },
      React.createElement(Text, { style: { fontSize: 10, fontFamily: bold ? "Helvetica-Bold" : "Helvetica", color: accent ? "#dc2626" : "#1a2035" } }, label),
      React.createElement(Text, { style: { fontSize: 10, fontFamily: bold ? "Helvetica-Bold" : "Helvetica", color: accent && netOwed > 0 ? "#dc2626" : bold ? "#0f1f3d" : "#1a2035" } }, value),
    );

  const detailRow = (label: string, value: string, idx: number) =>
    React.createElement(
      View,
      { style: { flexDirection: "row", padding: "5 10", backgroundColor: idx % 2 === 0 ? "transparent" : "#f8f9fa", borderBottomWidth: 1, borderBottomColor: "#e8ecf2" } },
      React.createElement(Text, { style: { flex: 1, fontSize: 9, color: "#1a2035" } }, label),
      React.createElement(Text, { style: { width: 80, fontSize: 9, textAlign: "right", color: "#1a2035" } }, value),
    );

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: S.page },
      // Header
      React.createElement(
        View,
        { style: { ...S.header, marginBottom: 28 } },
        React.createElement(
          View,
          { style: S.headerRow },
          React.createElement(
            View,
            null,
            React.createElement(Text, { style: S.companyName }, orgName),
            React.createElement(Text, { style: S.dateRange }, `Tax Summary · ${fmtDate(startDate)} – ${fmtDate(endDate)}`),
          ),
          React.createElement(Text, { style: S.docTitle }, "TAX SUMMARY"),
        ),
      ),
      // Summary box
      React.createElement(
        View,
        { style: { marginBottom: 24, borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: "#e8ecf2" } },
        summaryRow("Tax Collected (from invoices)", fmtMoney(taxCollected)),
        summaryRow("Tax Paid (on expenses)", fmtMoney(taxPaid)),
        summaryRow("Net Tax Owed", fmtMoney(netOwed), true, netOwed > 0),
      ),
      // Tax collected detail
      invoices.length > 0 && React.createElement(
        View,
        { style: { marginBottom: 20 } },
        React.createElement(
          View,
          { style: { ...S.tableHeader, marginBottom: 0 } },
          React.createElement(Text, { style: [S.tableHeaderCell, { flex: 1 }] }, "Invoice"),
          React.createElement(Text, { style: [S.tableHeaderCell, { width: "18%" }] }, "Date"),
          React.createElement(Text, { style: [S.tableHeaderCell, { width: 80, textAlign: "right" }] }, "Tax Collected"),
        ),
        ...invoices.map((inv, i) =>
          detailRow(
            `${(inv.invoice_number as string) ?? `INV-${String(inv.id).slice(0, 8).toUpperCase()}`} · ${clientName(inv.customers as Record<string, unknown> | null)}`,
            fmtMoney(Number(inv.tax_amount ?? 0)),
            i,
          )
        ),
      ),
      // Tax paid detail
      expenses.length > 0 && React.createElement(
        View,
        { style: { marginBottom: 20 } },
        React.createElement(
          View,
          { style: { ...S.tableHeader, marginBottom: 0 } },
          React.createElement(Text, { style: [S.tableHeaderCell, { flex: 1 }] }, "Expense / Vendor"),
          React.createElement(Text, { style: [S.tableHeaderCell, { width: "18%" }] }, "Date"),
          React.createElement(Text, { style: [S.tableHeaderCell, { width: 80, textAlign: "right" }] }, "Tax Paid"),
        ),
        ...expenses.map((e, i) =>
          detailRow(
            String(e.vendor ?? "Unknown"),
            fmtMoney(Number(e.tax_amount ?? 0)),
            i,
          )
        ),
      ),
      // Footer
      React.createElement(
        View,
        { style: S.footer },
        React.createElement(Text, { style: S.footerText }, `Generated ${fmtDate(new Date().toISOString())} · ${orgName}`),
        React.createElement(Text, { style: S.footerText }, "Powered by TradeBase"),
      ),
    ),
  );
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "invoices"; // invoices | receipts | tax-summary
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const status = searchParams.get("status");

  // Fetch org name
  const { data: org } = await admin.from("orgs").select("name").eq("id", orgId!).single();
  const orgName = (org?.name as string) ?? "Your Company";

  let pdfBuffer: Buffer;

  // ── Tax Summary ────────────────────────────────────────────────────────────
  if (type === "tax-summary") {
    let invQ: any = (admin as any)
      .from("invoices")
      .select("id,invoice_number,tax_amount,created_at,customers(first_name,last_name,company_name)")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false });
    if (start) invQ = invQ.gte("created_at", start);
    if (end) invQ = invQ.lte("created_at", end + "T23:59:59");
    const { data: invoices } = await invQ;

    let expQ: any = (admin as any)
      .from("expenses")
      .select("vendor,tax_amount,receipt_date")
      .eq("org_id", orgId!)
      .order("receipt_date", { ascending: false });
    if (start) expQ = expQ.gte("receipt_date", start);
    if (end) expQ = expQ.lte("receipt_date", end + "T23:59:59");
    const { data: expenses } = await expQ;

    pdfBuffer = await renderToBuffer(
      React.createElement(TaxSummaryPDF, {
        invoices: (invoices ?? []) as Record<string, unknown>[],
        expenses: (expenses ?? []) as Record<string, unknown>[],
        orgName,
        startDate: start ?? new Date(new Date().getFullYear(), 0, 1).toISOString(),
        endDate: end ?? new Date().toISOString(),
      }),
    );

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tradebase-tax-summary-${today()}.pdf"`,
      },
    });
  }

  // ── Invoices / Receipts ────────────────────────────────────────────────────
  let query: any = (admin as any)
    .from("invoices")
    .select("id,invoice_number,status,total_amount,tax_amount,created_at,due_date,customers(first_name,last_name,company_name)")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: false });

  if (start) query = query.gte("created_at", start);
  if (end) query = query.lte("created_at", end + "T23:59:59");

  if (type === "receipts") {
    query = query.eq("status", "paid");
  } else if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: invoices } = await query;
  const invoiceList = (invoices ?? []) as Record<string, unknown>[];

  if (type === "receipts") {
    const invoiceIds = invoiceList.map((i) => String(i.id));
    const { data: items } = await (admin as any)
      .from("invoice_items")
      .select("invoice_id,description,quantity,unit_price,total_price")
      .in("invoice_id", invoiceIds.length > 0 ? invoiceIds : ["__none__"]);

    const lineItemsMap: Record<string, LineItem[]> = {};
    for (const item of (items ?? []) as any[]) {
      const key = String(item.invoice_id);
      if (!lineItemsMap[key]) lineItemsMap[key] = [];
      lineItemsMap[key].push({
        description: item.description ?? "",
        quantity: Number(item.quantity ?? 1),
        unit_price: Number(item.unit_price ?? 0),
        total_price: Number(item.total_price ?? 0),
      });
    }

    pdfBuffer = await renderToBuffer(
      React.createElement(ReceiptsPDF, { invoices: invoiceList, lineItemsMap, orgName }),
    );
  } else {
    pdfBuffer = await renderToBuffer(
      React.createElement(InvoiceSummaryPDF, {
        invoices: invoiceList,
        orgName,
        startDate: start ?? new Date(new Date().getFullYear(), 0, 1).toISOString(),
        endDate: end ?? new Date().toISOString(),
      }),
    );
  }

  const filename = type === "receipts"
    ? `tradebase-receipts-${today()}.pdf`
    : `tradebase-invoices-${today()}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
