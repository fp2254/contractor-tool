import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Invoice App for HVAC Contractors | TradeBase",
  description: "HVAC invoice app for contractors. Create and send invoices from the field, track service calls and payments, and manage customers from your phone.",
  openGraph: {
    title: "Invoice App for HVAC | TradeBase",
    description: "Send invoices from any HVAC job site. Built for heating and cooling contractors.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Invoice App for HVAC Contractors — Bill Service Calls From Your Phone"
      subtitle="Send professional invoices on-site after every service call, maintenance visit, or equipment install. Customers pay faster when they get the invoice the same day."
      problemHeadline="HVAC contractors leave money on the table with slow invoicing."
      problems={[
        "Service call invoices written up at the end of the week — customers forget details",
        "No easy record of what was charged for a specific call six months ago",
        "Cash collected on-site with no digital receipt or record",
        "Maintenance invoices and install invoices mixed together with no tracking",
        "Outstanding balances not known until you sit down and add it all up manually",
      ]}
      solutionHeadline="Invoice every service call before you drive to the next one."
      solutionText="TradeBase lets HVAC contractors create and send professional invoices from any phone. Your standard services — tune-up, refrigerant charge, filter change, thermostat install, system replacement — are saved once. At the end of each call, tap the customer, tap the services, add any specific parts or notes, and send the invoice. Every service call is logged, every payment is tracked, and you always know your outstanding balance."
      features={[
        { icon: "🌡️", name: "HVAC Service Presets", desc: "Save tune-ups, refrigerant, filter changes, and any common service for fast invoicing." },
        { icon: "🧾", name: "Per-Call Invoicing", desc: "Invoice after every service call — not in a weekly batch." },
        { icon: "💵", name: "Payment Tracking", desc: "Log cash, check, or digital and close the invoice on the spot." },
        { icon: "👤", name: "Equipment Notes", desc: "Add equipment details to customer records — unit brand, model, install date." },
        { icon: "📤", name: "Email Delivery", desc: "Professional invoice to the customer's email, not a handwritten receipt." },
        { icon: "📊", name: "Revenue Dashboard", desc: "See paid, outstanding, and overdue at a glance. Always know your number." },
        { icon: "📅", name: "Dispatch Tracking", desc: "Track scheduled service calls and upcoming maintenance visits." },
        { icon: "📱", name: "Any Phone", desc: "iOS and Android. No download required — works in the browser." },
      ]}
      ctaText="Try It Free"
      mistakes={[
        "Verbal price estimates for installs — always get the number in writing before starting",
        "Not noting refrigerant type and charge amount — service records prevent repeat diagnostic time",
        "Bundling emergency calls into regular invoices — separate line items prevent disputes",
        "No reminder system for annual maintenance — recurring revenue gets left on the table",
      ]}
      internalLinks={[
        { href: "/for-hvac", label: "App for HVAC Contractors" },
        { href: "/hvac-business-software", label: "HVAC Business Software" },
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
        { href: "/field-invoice-app", label: "Field Invoice App" },
        { href: "/how-contractors-send-invoices-fast", label: "Send Invoices Fast" },
      ]}
    />
  );
}
