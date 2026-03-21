import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Invoice App for Electricians | Mobile Billing | TradeBase",
  description: "Invoice app built for electricians. Create and send professional invoices from any job site in under 2 minutes. Track payments and customers from your phone.",
  openGraph: {
    title: "Invoice App for Electricians | TradeBase",
    description: "Send professional invoices from the job site. Built for electrical contractors.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Invoice App for Electricians — Send the Invoice Before You Leave the Panel"
      subtitle="Close the panel, open TradeBase, build the invoice, send it. Customer gets a professional invoice and you have a record — before you've backed out of the driveway."
      problemHeadline="Electrical invoices delayed are electrical invoices disputed."
      problems={[
        "Invoicing from memory two days after a complex job — details get fuzzy",
        "Customers questioning labor hours you can't easily document after the fact",
        "No system to track which service calls or panel jobs got billed",
        "Cash collected on-site with no receipt — 'I already paid you' disputes",
        "Month-end revenue unclear because invoices aren't tracked consistently",
      ]}
      solutionHeadline="Fast, professional invoicing that works while you're still on-site."
      solutionText="TradeBase gives electrical contractors a fast way to invoice from any phone. Save your standard items — panel upgrade labor, outlet installation, troubleshooting rates — and pull them into an invoice with a tap. Add any custom items for the specific job, send it to the customer's email, and log payment on the spot if they're paying right away. Everything is tied to the customer record so you always have the full history."
      features={[
        { icon: "⚡", name: "Electrical Service Presets", desc: "Save your standard rates and services. Build invoices in seconds." },
        { icon: "🧾", name: "Instant Invoicing", desc: "Build and send a complete invoice from the job site on any phone." },
        { icon: "💵", name: "On-Site Payment", desc: "Log payment immediately and close the invoice in the same session." },
        { icon: "📤", name: "Professional Delivery", desc: "Invoice sent to customer email — not a text or a handwritten note." },
        { icon: "👤", name: "Customer Records", desc: "Full history per customer — every service call, invoice, and payment." },
        { icon: "📊", name: "Outstanding Balances", desc: "See what you're owed without digging through invoices manually." },
        { icon: "📋", name: "Quote-to-Invoice", desc: "Convert a signed quote to an invoice with one tap when the job is done." },
        { icon: "📱", name: "Phone-First", desc: "Built for phones. Fast on a small screen. No laptop required." },
      ]}
      ctaText="Try It Free"
      mistakes={[
        "Invoicing labor as a flat number without hourly breakdown — gets questioned every time",
        "No photo documentation tied to the invoice — photos attached to job records protect you",
        "Sending from a personal Gmail — unprofessional and easy to lose track of",
        "One invoice for a multi-phase job — break it into milestones for better cash flow",
      ]}
      internalLinks={[
        { href: "/for-electricians", label: "App for Electricians" },
        { href: "/electrician-business-software", label: "Electrician Business Software" },
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
        { href: "/create-invoice-on-phone", label: "Create Invoice on Phone" },
        { href: "/how-contractors-send-invoices-fast", label: "Send Invoices Fast" },
      ]}
    />
  );
}
