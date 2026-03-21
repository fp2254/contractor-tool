import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Invoice App for Handyman | Fast, Simple, Mobile | TradeBase",
  description: "The simplest invoice app for handymen. Send professional invoices from your phone, track payments, and see every job and customer in one place.",
  openGraph: {
    title: "Invoice App for Handyman | TradeBase",
    description: "Send professional invoices from your phone. Built for handymen and small trade contractors.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Invoice App for Handyman — Get Paid Without the Paperwork"
      subtitle="Send professional invoices from your phone before you leave the job. Track every payment. Know exactly what's owed at any time."
      problemHeadline="Handymen lose money on admin, not on the job."
      problems={[
        "Writing invoices by hand or in Notes — looks unprofessional and easy to dispute",
        "Forgetting to invoice smaller jobs because they pile up",
        "Collecting cash with no receipt and no record of what was paid",
        "No way to see which customers still owe money without going through texts",
        "Spending evenings catching up on invoicing instead of resting",
      ]}
      solutionHeadline="Invoice on-site. Get paid faster."
      solutionText="TradeBase gives handymen a simple way to invoice from any phone. Save your standard services once — door repair, drywall patch, fixture install, whatever you do — and build an invoice in under a minute at the job site. Send it straight to the customer's email. Log the payment when it comes in. Your dashboard shows you exactly what's paid and what's outstanding without any effort."
      features={[
        { icon: "🧾", name: "Fast Invoices", desc: "Build a complete invoice in under 90 seconds from any phone." },
        { icon: "📋", name: "Saved Services", desc: "Your most common services saved and ready to add with one tap." },
        { icon: "💵", name: "Payment Logging", desc: "Record cash, check, Venmo, Zelle — whatever the customer uses." },
        { icon: "📤", name: "Email Invoices", desc: "Professional invoice goes to the customer's email, not a screenshot." },
        { icon: "👤", name: "Customer Records", desc: "Every customer's jobs, invoices, and payment history in one place." },
        { icon: "🔴", name: "Overdue Tracking", desc: "Overdue invoices surfaced automatically — no spreadsheet needed." },
        { icon: "📅", name: "Job Tracking", desc: "See upcoming and active jobs so nothing gets overlooked." },
        { icon: "📱", name: "No App Download", desc: "Works in your phone's browser. Nothing to install." },
      ]}
      ctaText="Try It Free"
      mistakes={[
        "Texting customers the total — no paper trail if there's any dispute later",
        "Invoicing once a week — weekly invoicing means weekly delays in getting paid",
        "Not saving service prices — recalculating every time wastes time and creates inconsistency",
        "Forgetting about a small job entirely — small jobs add up and missing them hurts",
      ]}
      internalLinks={[
        { href: "/for-handyman", label: "App for Handyman Business" },
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
        { href: "/create-invoice-on-phone", label: "Create an Invoice on Your Phone" },
        { href: "/field-invoice-app", label: "Field Invoice App" },
        { href: "/how-contractors-send-invoices-fast", label: "How Contractors Send Invoices Fast" },
      ]}
    />
  );
}
