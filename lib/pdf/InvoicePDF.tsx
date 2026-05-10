import React from "react";
import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { base, NAVY } from "./styles";

type InvoiceItem = {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type Props = {
  invoice: {
    id: string;
    invoice_number: string | null;
    status: string;
    total_amount: number;
    due_date: string | null;
    created_at: string;
  };
  items: InvoiceItem[];
  customer: {
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    phone: string | null;
    email: string | null;
    address_line1: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  org: {
    name: string;
  };
  settings: {
    primary_phone?: string | null;
    business_email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    owner_name?: string | null;
    signature_footer?: string | null;
    invoice_footer_template?: string | null;
    accepted_payment_methods?: string | null;
    payment_instructions?: string | null;
    default_tax_rate?: number | null;
    tax_applied_auto?: boolean | null;
    logo_url?: string | null;
  } | null;
  warrantyText?: string | null;
  notes?: string[];
  photos?: { url: string; filename: string | null }[];
};

function fmt(n: number) {
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function InvoicePDF({ invoice, items, customer, org, settings, warrantyText, notes, photos }: Props) {
  const s = settings ?? {};
  const taxRate = s.tax_applied_auto ? (s.default_tax_rate ?? 0) : 0;
  const subtotal = items.reduce((sum, i) => sum + Number(i.total_price), 0);
  const taxAmt = subtotal * (taxRate / 100);
  const total = subtotal + taxAmt || Number(invoice.total_amount);

  const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.company_name || "Customer";
  const customerAddr = [customer.address_line1, customer.city, customer.state, customer.zip].filter(Boolean).join(", ");
  const invoiceNum = invoice.invoice_number ?? `INV-${invoice.id.slice(0, 8).toUpperCase()}`;
  const created = fmtDate(invoice.created_at);
  const dueDate = invoice.due_date ? fmtDate(invoice.due_date) : "Due on Receipt";

  const bizLines = [
    s.address ? [s.address, s.city, s.state].filter(Boolean).join(", ") : null,
    s.primary_phone,
    s.business_email,
  ].filter(Boolean);

  const methods = (s.accepted_payment_methods ?? "cash,check,card").split(",").map(m => m.trim()).filter(Boolean);
  const isPaid = invoice.status === "paid";
  const isOverdue = invoice.status === "overdue";

  return (
    <Document>
      <Page size="A4" style={base.page}>
        {/* Header */}
        <View style={base.header}>
          <View>
            {s.logo_url ? (
              <Image
                src={s.logo_url}
                style={{ width: 90, height: 45, objectFit: "contain", marginBottom: 6 }}
              />
            ) : null}
            <Text style={base.bizName}>{org.name}</Text>
            {bizLines.map((line, i) => <Text key={i} style={base.bizDetail}>{line}</Text>)}
          </View>
          <View>
            <Text style={base.docLabel}>INVOICE</Text>
            <Text style={base.docMeta}>{invoiceNum}</Text>
            <Text style={base.docMeta}>Date: {created}</Text>
            <Text style={[base.docMeta, { color: isOverdue ? "#EF4444" : "#64748B", fontFamily: "Helvetica-Bold" }]}>
              Due: {dueDate}
            </Text>
            {isPaid && <Text style={[base.docMeta, { color: "#22C55E", fontFamily: "Helvetica-Bold" }]}>✓ PAID</Text>}
          </View>
        </View>

        {/* Bill To / Invoice Info */}
        <View style={base.infoRow}>
          <View style={base.infoBox}>
            <Text style={base.infoLabel}>Bill To</Text>
            <Text style={base.infoValue}>{customerName}</Text>
            {customer.company_name && customer.first_name && <Text style={base.infoSub}>{customer.company_name}</Text>}
            {customerAddr ? <Text style={base.infoSub}>{customerAddr}</Text> : null}
            {customer.phone ? <Text style={base.infoSub}>{customer.phone}</Text> : null}
            {customer.email ? <Text style={base.infoSub}>{customer.email}</Text> : null}
          </View>
          <View style={base.infoBox}>
            <Text style={base.infoLabel}>Payment Info</Text>
            <Text style={base.infoSub}>Invoice: {invoiceNum}</Text>
            <Text style={base.infoSub}>Status: {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</Text>
            <Text style={base.infoSub}>Amount Due: {fmt(total)}</Text>
            <Text style={base.infoSub}>Due: {dueDate}</Text>
          </View>
        </View>

        {/* Line Items */}
        {items.length > 0 && (
          <>
            <View style={base.tableHeader}>
              <Text style={[base.tableHeaderText, base.colDesc]}>Description</Text>
              <Text style={[base.tableHeaderText, base.colQty]}>Qty</Text>
              <Text style={[base.tableHeaderText, base.colPrice]}>Unit Price</Text>
              <Text style={[base.tableHeaderText, base.colTotal]}>Total</Text>
            </View>
            {items.map((item, i) => (
              <View key={i} style={[base.tableRow, i % 2 === 1 ? base.tableRowAlt : {}]}>
                <Text style={[base.tableCell, base.colDesc]}>{item.description}</Text>
                <Text style={[base.tableCell, base.colQty]}>{item.quantity}</Text>
                <Text style={[base.tableCell, base.colPrice]}>{fmt(item.unit_price)}</Text>
                <Text style={[base.tableCell, base.colTotal]}>{fmt(Number(item.total_price))}</Text>
              </View>
            ))}
          </>
        )}

        {/* Totals */}
        <View style={base.totalsBox}>
          {items.length > 0 && (
            <View style={base.totalsRow}>
              <Text style={base.totalsLabel}>Subtotal</Text>
              <Text style={base.totalsValue}>{fmt(subtotal)}</Text>
            </View>
          )}
          {taxRate > 0 && (
            <View style={base.totalsRow}>
              <Text style={base.totalsLabel}>Tax ({taxRate}%)</Text>
              <Text style={base.totalsValue}>{fmt(taxAmt)}</Text>
            </View>
          )}
          <View style={base.totalFinalRow}>
            <Text style={base.totalFinalLabel}>{isPaid ? "AMOUNT PAID" : "AMOUNT DUE"}</Text>
            <Text style={base.totalFinalValue}>{fmt(total)}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        {!isPaid && methods.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <View style={[base.notesBox, { borderLeft: `3px solid #22C55E` }]}>
              <Text style={base.notesLabel}>Accepted Payment Methods</Text>
              <Text style={base.notesText}>{methods.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join("  ·  ")}</Text>
              {s.payment_instructions && (
                <Text style={[base.notesText, { marginTop: 4 }]}>{s.payment_instructions}</Text>
              )}
            </View>
          </View>
        )}

        {/* Job Notes */}
        {notes && notes.length > 0 ? (
          <View style={[base.notesBox, { marginTop: 12, borderLeft: `3px solid #94A3B8` }]}>
            <Text style={base.notesLabel}>Notes</Text>
            {notes.map((n, i) => (
              <Text key={i} style={[base.notesText, i > 0 ? { marginTop: 4 } : {}]}>{n}</Text>
            ))}
          </View>
        ) : null}

        {/* Warranty / Terms */}
        {warrantyText ? (
          <View style={[base.notesBox, { marginTop: 12, borderLeft: `3px solid ${NAVY}` }]}>
            <Text style={base.notesLabel}>Terms &amp; Warranty</Text>
            <Text style={base.notesText}>{warrantyText}</Text>
          </View>
        ) : null}

        {/* Job Photos */}
        {photos && photos.length > 0 ? (
          <View style={{ marginTop: 16 }}>
            <Text style={[base.notesLabel, { marginBottom: 6 }]}>
              Photos ({photos.length})
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {photos.slice(0, 9).map((p, i) => (
                <View
                  key={i}
                  style={{
                    width: "33%",
                    paddingRight: i % 3 !== 2 ? 3 : 0,
                    paddingBottom: 3,
                  }}
                >
                  <Image
                    src={p.url}
                    style={{ width: "100%", height: 85 }}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Footer notes */}
        {s.invoice_footer_template && (
          <View style={[base.notesBox, { marginTop: 12 }]}>
            <Text style={base.notesText}>{s.invoice_footer_template}</Text>
          </View>
        )}

        <View style={base.footer}>
          <Text style={base.footerText}>{org.name}</Text>
          <Text style={base.footerText}>{s.signature_footer ?? "Thank you for your business."}</Text>
          <Text style={base.footerText}>{invoiceNum}</Text>
        </View>
        <View style={{ marginTop: 6, alignItems: "center" }}>
          <Text style={{ fontSize: 7, color: "#CBD5E1" }}>Generated with TradeBase · trade-base.biz</Text>
        </View>
      </Page>
    </Document>
  );
}
