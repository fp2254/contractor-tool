import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "How to Send a Contractor Estimate From Your Phone | TradeBase",
  description: "Step-by-step: how to send a professional contractor estimate from your phone in under 2 minutes using TradeBase.",
  openGraph: {
    title: "How to Send a Contractor Estimate From Your Phone",
    description: "Send professional estimates from any job site. No laptop needed. Built for contractors.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="How to Send a Professional Contractor Estimate From Your Phone"
      subtitle="You don't need a laptop, a printer, or a special app from the app store. Here's how to send a professional estimate from your phone in under two minutes."
      problemHeadline="Most contractors send estimates too slow — or not at all."
      problems={[
        "Driving home to write the estimate up on a computer — job goes cold",
        "Texting a number without a proper document — no paper trail if disputed",
        "Using Word templates that are clunky to edit on a phone",
        "No record of what was quoted and when — leads to confusion on invoicing",
        "Follow-up forgotten because there's no reminder system",
      ]}
      solutionHeadline="Send a professional estimate in four steps from any job site."
      solutionText="With TradeBase, sending an estimate from your phone takes about 90 seconds. Step 1: open the app and tap New Quote. Step 2: pick the customer (or add a new one). Step 3: add your services and prices — tap from your saved list or type custom items. Step 4: tap Send. The customer gets a professional estimate by email. You get a record. Nothing more to do until they respond."
      features={[
        { icon: "📋", name: "Quick Quote Builder", desc: "Build a line-item estimate from saved services or custom items in seconds." },
        { icon: "👤", name: "New Client On-the-Spot", desc: "Add a new customer while building the quote — no pre-entry required." },
        { icon: "📤", name: "Email Delivery", desc: "Estimate goes to the customer's inbox — professional and documented." },
        { icon: "✅", name: "Online Approval", desc: "Customer can review and approve the quote from their phone." },
        { icon: "🔔", name: "Follow-up Reminders", desc: "Get reminded to follow up on estimates that haven't been answered." },
        { icon: "📊", name: "Quote Tracking", desc: "See all sent, approved, and declined estimates in one view." },
        { icon: "🧾", name: "Quote-to-Invoice", desc: "Convert the approved estimate to an invoice with one tap." },
        { icon: "📱", name: "Phone-First", desc: "Every screen built for thumb navigation, not a desktop." },
      ]}
      ctaText="Send My First Estimate Free"
      mistakes={[
        "Sending estimates more than 24 hours after the site visit — close rate drops significantly",
        "One-line estimates with just a total — itemized quotes get approved faster and disputed less",
        "No expiry date on the estimate — prices are valid forever if you don't set a limit",
        "Not following up after 48–72 hours — most approvals come after one follow-up",
      ]}
      internalLinks={[
        { href: "/contractor-estimating-app", label: "Contractor Estimating App" },
        { href: "/contractor-quote-app", label: "Contractor Quote App" },
        { href: "/estimate-template-for-contractors", label: "Estimate Template for Contractors" },
        { href: "/how-contractors-send-invoices-fast", label: "How to Send Invoices Fast" },
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
      ]}
    />
  );
}
