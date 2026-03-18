import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Invoice Software for Contractors – Send & Track Invoices | TradeBase",
  description: "TradeBase is invoice software for contractors. Send professional invoices from your phone, track payments, and stop chasing what you're owed.",
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Invoice Software for Contractors That Actually Works in the Field"
      subtitle="Send professional invoices from your phone the moment a job is done. Track what's paid, what's overdue, and what still needs to go out."
      problemHeadline="Contractor invoicing is broken for most small shops."
      problems={[
        "Invoices going out days or weeks after the job is done",
        "Chasing payments with no clear record of what was sent",
        "Customers claiming they never got the invoice",
        "No way to know what's paid, what's overdue, at a glance",
        "Using generic tools that weren't built for contractors",
      ]}
      solutionHeadline="Send the invoice before you leave the driveway."
      solutionText="TradeBase lets you build and send a professional invoice directly from the job site — line items, totals, due dates, and payment instructions included. Customers get a link to view and download it without needing an account. You get a clear dashboard of what's been paid and what's still outstanding."
      features={[
        { icon: "💵", name: "Instant Invoicing", desc: "Build and send invoices from your phone in under 2 minutes." },
        { icon: "📊", name: "Payment Tracking", desc: "Mark invoices paid, track partial payments, see what's overdue." },
        { icon: "🔔", name: "Overdue Alerts", desc: "Dashboard flags overdue invoices so nothing slips through." },
        { icon: "📤", name: "Customer Portal", desc: "Customers open a link to view and download their invoice. No app needed." },
        { icon: "📋", name: "Quote → Invoice", desc: "Convert an approved quote to an invoice in one tap. No re-entry." },
        { icon: "🧾", name: "Line Items", desc: "Add labor, materials, and fees with quantities and unit prices." },
        { icon: "👤", name: "Customer History", desc: "See every invoice per customer — sent, paid, and outstanding." },
        { icon: "🤖", name: "Follow-up Drafter", desc: "AI writes a professional follow-up for any unpaid invoice." },
        { icon: "📱", name: "Mobile-First", desc: "Built for a phone screen. No laptop required." },
      ]}
      ctaText="Start Invoicing Faster"
    />
  );
}
