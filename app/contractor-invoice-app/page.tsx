import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Contractor Invoice App | Send Invoices From Your Phone",
  description: "The simplest contractor invoice app. Create and send professional invoices from any job site in under 2 minutes. No laptop needed.",
  openGraph: {
    title: "Contractor Invoice App | TradeBase",
    description: "Create and send professional contractor invoices from your phone. Fast, simple, and built for the field.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Contractor Invoice App — Send Invoices From Any Job Site"
      subtitle="Create a professional invoice on your phone before you leave the driveway. Customers pay faster when they get the invoice the same day."
      problemHeadline="Most contractors wait too long to send invoices."
      problems={[
        "Invoices written up at home three days after the job — customers forget details",
        "No easy way to create a professional invoice without a computer",
        "Generic Word docs that look unprofessional and take 20 minutes to fill out",
        "Collecting cash with no receipt and no record",
        "Not knowing which customers still owe money until you dig through notes",
      ]}
      solutionHeadline="Invoice the moment the job is done."
      solutionText="TradeBase lets you build a professional invoice from your phone in under two minutes. Pull in your standard services, add line items, set the total, and send it straight to the customer's email. Every invoice is logged automatically — you'll always know what's paid, what's pending, and what's overdue without chasing through a folder or a stack of papers."
      features={[
        { icon: "🧾", name: "Fast Invoicing", desc: "Build and send a complete invoice in under two minutes from your phone." },
        { icon: "📋", name: "Service Presets", desc: "Save your common services so you're not typing them in every time." },
        { icon: "💵", name: "Payment Logging", desc: "Record cash, check, Venmo, or any other method and see your balance instantly." },
        { icon: "📤", name: "Email Delivery", desc: "Send invoices straight to the customer's email from the field." },
        { icon: "👤", name: "Per-Customer History", desc: "Every invoice is stored under the right customer automatically." },
        { icon: "🔴", name: "Overdue Tracking", desc: "See which invoices are overdue without digging through spreadsheets." },
        { icon: "📊", name: "Revenue Summary", desc: "Dashboard shows your total paid, unpaid, and overdue at a glance." },
        { icon: "📱", name: "No App Store Needed", desc: "Works in any mobile browser. Nothing to download." },
      ]}
      ctaText="Try the Invoice App Free"
      mistakes={[
        "Waiting until Friday to invoice the whole week — customers dispute details from five days ago",
        "Sending invoices without a due date — no due date means no urgency to pay",
        "Not itemizing line items — vague totals get questioned, specific invoices get paid",
        "Using the same invoice number twice — creates accounting confusion fast",
      ]}
      internalLinks={[
        { href: "/create-invoice-on-phone", label: "Create an Invoice on Your Phone" },
        { href: "/how-contractors-send-invoices-fast", label: "How Contractors Send Invoices Fast" },
        { href: "/free-contractor-invoice-template", label: "Free Contractor Invoice Template" },
        { href: "/contractor-quote-app", label: "Contractor Quote App" },
        { href: "/field-invoice-app", label: "Field Invoice App" },
      ]}
    />
  );
}
