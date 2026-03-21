import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "How Contractors Send Invoices Fast | TradeBase",
  description: "The fastest way for contractors to send invoices: from the job site, on your phone, in under 2 minutes. Here's exactly how to do it.",
  openGraph: {
    title: "How Contractors Send Invoices Fast | TradeBase",
    description: "Send contractor invoices from the job site in under 2 minutes. Phone-first invoicing built for the field.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="How Contractors Send Invoices Fast — From Any Job Site, in Under 2 Minutes"
      subtitle="The fastest invoice is the one sent before you leave. Here's the exact approach that gets contractors paid days faster than waiting until evening."
      problemHeadline="The slow way contractors invoice — and why it costs them."
      problems={[
        "Driving home to write invoices — customers have moved on and details are fuzzy",
        "Batch invoicing once a week — a week's worth of jobs means a week's delay in payment",
        "Typing everything from scratch each time — 20 minutes per invoice adds up fast",
        "No reminder system — invoices forgotten, payment delayed",
        "Customers not knowing payment is due until they finally ask",
      ]}
      solutionHeadline="The fast way: invoice on-site, every time."
      solutionText="Contractors who get paid fastest share one habit: they invoice before they leave the job. With TradeBase, that takes under two minutes. Your services are saved. Your customer is already in the system. You tap to add the line items, set the total, and send. The customer gets the invoice in their email while you're still packing up your tools. That same-day invoicing closes the mental loop for the customer — they pay while the job is fresh."
      features={[
        { icon: "💾", name: "Saved Services", desc: "Your most common services saved — no typing required every time." },
        { icon: "📋", name: "Quick Builder", desc: "Build a complete line-item invoice in 60–90 seconds." },
        { icon: "📤", name: "Instant Send", desc: "Invoice sent to customer email directly from the app on-site." },
        { icon: "💵", name: "On-Site Payment", desc: "Customer pays right then? Log it and close the invoice immediately." },
        { icon: "📊", name: "Outstanding View", desc: "Dashboard shows unpaid invoices — no spreadsheet math needed." },
        { icon: "🔴", name: "Overdue Tracking", desc: "Overdue invoices flagged so you can follow up at the right time." },
        { icon: "🧾", name: "Quote-to-Invoice", desc: "If you quoted first, convert the approved quote to an invoice in one tap." },
        { icon: "📱", name: "Phone-First", desc: "Designed to be fast on a phone screen. Not a scaled-down desktop app." },
      ]}
      ctaText="Start Invoicing Faster"
      mistakes={[
        "Waiting until end of week to invoice — same-day invoicing gets paid 2–3x faster",
        "Sending invoices without a due date — 'due upon receipt' is vague; a specific date works better",
        "Not following up on overdue invoices — one polite reminder collects most late payments",
        "Invoicing by text message — it looks informal and there's no tracked record of delivery",
      ]}
      internalLinks={[
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
        { href: "/create-invoice-on-phone", label: "Create an Invoice on Your Phone" },
        { href: "/field-invoice-app", label: "Field Invoice App" },
        { href: "/free-contractor-invoice-template", label: "Free Invoice Template" },
        { href: "/how-to-organize-contractor-jobs", label: "How to Organize Jobs" },
      ]}
    />
  );
}
