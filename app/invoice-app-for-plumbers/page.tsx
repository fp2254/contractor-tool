import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Invoice App for Plumbers | Mobile Invoicing | TradeBase",
  description: "Simple invoicing for plumbers. Create and send professional invoices from the job site, track payments, and manage every customer from your phone.",
  openGraph: {
    title: "Invoice App for Plumbers | TradeBase",
    description: "Send professional invoices from any job site. Built for plumbing contractors.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Invoice App for Plumbers — Bill From the Job Site, Not From Home"
      subtitle="Create a professional invoice on your phone before the water's even back on. Customers get it instantly. You get paid faster."
      problemHeadline="Plumbing invoices that wait until tonight don't get sent."
      problems={[
        "Writing the job up at home after a 10-hour day — half the time it doesn't happen",
        "Customers questioning line items because the invoice came days after the job",
        "No easy way to track which service calls got invoiced and which didn't",
        "Payment collected on-site with no receipt and no record",
        "End of month scramble to figure out what you're actually owed",
      ]}
      solutionHeadline="Invoice while the tools are still in your hands."
      solutionText="TradeBase is built for field use. Your standard plumbing services — drain clearing, water heater install, leak repair, fixture swap — are saved once. At the job site, you pick the customer, tap the services, adjust any custom items, and send the invoice in under two minutes. The customer gets a professional email. You get a record. No late-night paperwork."
      features={[
        { icon: "🔧", name: "Trade-Specific Presets", desc: "Save your most common plumbing services for instant quote and invoice building." },
        { icon: "🧾", name: "On-Site Invoicing", desc: "Build and send before you leave. No more 'I'll do it tonight.'" },
        { icon: "💵", name: "Payment Tracking", desc: "Log cash, check, or digital payments and close the invoice immediately." },
        { icon: "📤", name: "Professional Email", desc: "Invoice arrives in the customer's inbox with your business name." },
        { icon: "👤", name: "Customer History", desc: "Every service call, invoice, and payment logged per customer automatically." },
        { icon: "📊", name: "Outstanding Balance", desc: "Dashboard shows what you're owed without any spreadsheet work." },
        { icon: "🔴", name: "Overdue Alerts", desc: "Overdue invoices flagged automatically — follow up at the right time." },
        { icon: "📱", name: "Any Phone", desc: "iOS and Android. Works in the browser — no download required." },
      ]}
      ctaText="Try It Free"
      mistakes={[
        "Combining multiple service calls into one monthly invoice — disputes multiply",
        "Not noting the exact service performed — 'plumbing work' gets questioned months later",
        "Waiting for the customer to ask for an invoice — proactive invoicing gets paid faster",
        "No signed estimate before work starts — no signed quote means a negotiated final total",
      ]}
      internalLinks={[
        { href: "/for-plumbers", label: "App for Plumbers" },
        { href: "/plumbing-business-software", label: "Plumbing Business Software" },
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
        { href: "/how-contractors-send-invoices-fast", label: "Send Invoices Fast" },
        { href: "/field-invoice-app", label: "Field Invoice App" },
      ]}
    />
  );
}
