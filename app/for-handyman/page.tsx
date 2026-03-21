import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "App for Handyman Business | TradeBase",
  description: "Run your handyman business from your phone. Send quotes, create invoices, track jobs and customers — no office needed.",
  openGraph: {
    title: "App for Handyman Business | TradeBase",
    description: "Run your handyman business from your phone. Quotes, invoices, jobs, and customers in one simple app.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="The Handyman App That Runs Your Business From Your Phone"
      subtitle="Send quotes on-site, create invoices before you leave the driveway, and track every job and customer without paperwork or extra office staff."
      problemHeadline="Running a handyman business shouldn't be this complicated."
      problems={[
        "Writing estimates by hand and losing them before they're signed",
        "Chasing down payments weeks after the job is done",
        "Forgetting which jobs are scheduled for next week",
        "No record of what you charged a customer 6 months ago",
        "Spending your evenings on paperwork instead of rest",
      ]}
      solutionHeadline="One app for everything a handyman needs."
      solutionText="TradeBase is built for handymen and small trade contractors. You can create a professional quote in under two minutes, send it to the customer on the spot, convert it to an invoice when the job is done, and collect payment — all from your phone. Every customer, job, and invoice is logged and easy to find later."
      features={[
        { icon: "📋", name: "Quick Quotes", desc: "Build and send a professional estimate from the job site in minutes." },
        { icon: "🧾", name: "Invoicing", desc: "Convert any quote to an invoice with one tap. No double entry." },
        { icon: "💵", name: "Payment Tracking", desc: "Log cash, check, Venmo — see what's paid and what's overdue." },
        { icon: "👤", name: "Customer Records", desc: "Every customer has a full history of jobs, quotes, and invoices." },
        { icon: "📅", name: "Job Scheduling", desc: "Track upcoming and active jobs so nothing falls through the cracks." },
        { icon: "📥", name: "Lead Tracking", desc: "Log every inquiry and follow up at the right time." },
        { icon: "📱", name: "Phone-First Design", desc: "Built for a phone screen. No desktop required." },
        { icon: "🔔", name: "Follow-up Reminders", desc: "Get reminded to follow up on open quotes and unpaid invoices." },
      ]}
      ctaText="Try It Free"
      mistakes={[
        "Sending estimates as text messages — looks unprofessional and easy to dispute",
        "Not writing down payment when collected — leads to 'I already paid you' arguments",
        "Keeping customer info in your contacts app — no job history, no notes",
        "Waiting to invoice until you get home — half the time it never gets sent",
      ]}
      internalLinks={[
        { href: "/invoice-app-for-handyman", label: "Invoice App for Handyman" },
        { href: "/contractor-quote-app", label: "Contractor Quote App" },
        { href: "/job-tracking-for-contractors", label: "Job Tracking for Contractors" },
        { href: "/how-to-track-customers-as-a-contractor", label: "How to Track Customers" },
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
      ]}
    />
  );
}
