import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { base } from "./styles";

type QuoteItem = {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type Props = {
  quote: {
    id: string;
    status: string;
    total_amount: number;
    notes: string | null;
    created_at: string;
  };
  items: QuoteItem[];
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
    quote_notes_template?: string | null;
    default_tax_rate?: number | null;
    tax_applied_auto?: boolean | null;
    quote_expiration_days?: number | null;
  } | null;
};

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function QuotePDF({ quote, items, customer, org, settings }: Props) {
  const s = settings ?? {};
  const taxRate = s.tax_applied_auto ? (s.default_tax_rate ?? 0) : 0;
  const subtotal = items.reduce((sum, i) => sum + Number(i.total_price), 0);
  const taxAmt = subtotal * (taxRate / 100);
  const total = subtotal + taxAmt;

  const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.company_name || "Customer";
  const customerAddr = [customer.address_line1, customer.city, customer.state, customer.zip].filter(Boolean).join(", ");

  const quoteNum = `Q-${quote.id.slice(0, 8).toUpperCase()}`;
  const created = fmtDate(quote.created_at);
  const expDays = s.quote_expiration_days ?? 14;
  const expDate = fmtDate(new Date(new Date(quote.created_at).getTime() + expDays * 86400000).toISOString());

  const bizLines = [
    s.address ? [s.address, s.city, s.state].filter(Boolean).join(", ") : null,
    s.primary_phone,
    s.business_email,
  ].filter(Boolean);

  const notesText = quote.notes || s.quote_notes_template || null;

  return (
    <Document>
      <Page size="A4" style={base.page}>
        {/* Header */}
        <View style={base.header}>
          <View>
            <Text style={base.bizName}>{org.name}</Text>
            {bizLines.map((line, i) => <Text key={i} style={base.bizDetail}>{line}</Text>)}
          </View>
          <View>
            <Text style={base.docLabel}>QUOTE</Text>
            <Text style={base.docMeta}>{quoteNum}</Text>
            <Text style={base.docMeta}>Date: {created}</Text>
            <Text style={base.docMeta}>Valid Until: {expDate}</Text>
          </View>
        </View>

        {/* Bill To / Quote Info */}
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
            <Text style={base.infoLabel}>Quote Details</Text>
            <Text style={base.infoSub}>Number: {quoteNum}</Text>
            <Text style={base.infoSub}>Status: {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}</Text>
            <Text style={base.infoSub}>Date: {created}</Text>
            <Text style={base.infoSub}>Expires: {expDate}</Text>
          </View>
        </View>

        {/* Line Items */}
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

        {/* Totals */}
        <View style={base.totalsBox}>
          <View style={base.totalsRow}>
            <Text style={base.totalsLabel}>Subtotal</Text>
            <Text style={base.totalsValue}>{fmt(subtotal)}</Text>
          </View>
          {taxRate > 0 && (
            <View style={base.totalsRow}>
              <Text style={base.totalsLabel}>Tax ({taxRate}%)</Text>
              <Text style={base.totalsValue}>{fmt(taxAmt)}</Text>
            </View>
          )}
          <View style={base.totalFinalRow}>
            <Text style={base.totalFinalLabel}>TOTAL</Text>
            <Text style={base.totalFinalValue}>{fmt(total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {notesText && (
          <View style={base.notesBox}>
            <Text style={base.notesLabel}>Notes</Text>
            <Text style={base.notesText}>{notesText}</Text>
          </View>
        )}

        {/* Signature / Footer */}
        {s.owner_name && (
          <View style={{ marginTop: 32 }}>
            <Text style={{ fontSize: 9, color: "#94A3B8", marginBottom: 24 }}>Authorized by:</Text>
            <View style={{ borderTop: "1px solid #CBD5E1", width: 180, paddingTop: 4 }}>
              <Text style={{ fontSize: 9, color: "#1E293B" }}>{s.owner_name}</Text>
            </View>
          </View>
        )}

        <View style={base.footer}>
          <Text style={base.footerText}>{org.name}</Text>
          <Text style={base.footerText}>{s.signature_footer ?? "Thank you for your business."}</Text>
          <Text style={base.footerText}>{quoteNum}</Text>
        </View>
      </Page>
    </Document>
  );
}
