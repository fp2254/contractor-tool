import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Contractor Estimating App | Fast Field Quotes | TradeBase",
  description: "Contractor estimating app built for the field. Build professional estimates on your phone, send them instantly, and track approvals — all in one place.",
  openGraph: {
    title: "Contractor Estimating App | TradeBase",
    description: "Build and send professional contractor estimates from your phone. Fast, simple, built for the field.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Contractor Estimating App — Build and Send Estimates From the Field"
      subtitle="Stop driving home to write up estimates. Build a professional, itemized quote on your phone, send it from the job site, and track it until it's approved."
      problemHeadline="Slow estimates mean lost jobs."
      problems={[
        "Taking days to send an estimate after the site visit — the customer already called someone else",
        "Estimates scrawled on paper that get disputed when it's time to invoice",
        "No tracking of which estimates are out, which were approved, and which were declined",
        "Starting from scratch every time instead of using saved service rates",
        "No follow-up system — open estimates go cold with no reminder",
      ]}
      solutionHeadline="An estimating app built for how contractors actually work."
      solutionText="TradeBase is designed for contractors who estimate in the field. Save your standard services and rates once — then building an estimate is just selecting what applies to the job. Add any custom items, set a valid-until date, and send from your phone. Customers can review and approve online. You get notified when they do. When the job is done, one tap converts the estimate to an invoice."
      features={[
        { icon: "📋", name: "Service Rate Library", desc: "Save your prices once. Build estimates by selecting — not typing from scratch." },
        { icon: "📤", name: "Instant Send", desc: "Estimate goes to the customer's email straight from the field." },
        { icon: "✅", name: "Online Approval", desc: "Customers can review and approve on their phone — no printing." },
        { icon: "📊", name: "Estimate Pipeline", desc: "See all open, approved, and declined estimates in one view." },
        { icon: "🔔", name: "Follow-up Reminders", desc: "Get notified to follow up on estimates that have gone quiet." },
        { icon: "🧾", name: "Estimate-to-Invoice", desc: "Convert any approved estimate to an invoice in one tap." },
        { icon: "📥", name: "Lead Integration", desc: "Estimate is tied to the lead and customer automatically." },
        { icon: "📱", name: "Field-Ready", desc: "Designed for phone use on a job site, not a desktop in an office." },
      ]}
      ctaText="Try the Estimating App Free"
      mistakes={[
        "Sending estimates over 48 hours after the visit — close rates drop fast",
        "Lump-sum estimates with no line items — customers push back on vague totals",
        "No expiration date — customers come back months later expecting the same price",
        "Not following up at all — a single follow-up message closes most open estimates",
      ]}
      internalLinks={[
        { href: "/how-to-send-an-estimate-from-phone", label: "How to Send Estimates From Your Phone" },
        { href: "/contractor-quote-app", label: "Contractor Quote App" },
        { href: "/estimate-template-for-contractors", label: "Estimate Template for Contractors" },
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
        { href: "/job-tracking-for-contractors", label: "Job Tracking for Contractors" },
      ]}
    />
  );
}
