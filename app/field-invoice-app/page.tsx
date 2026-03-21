import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Field Invoice App for Contractors | TradeBase",
  description: "Invoice from the field — not from your desk. Build and send professional contractor invoices from any job site in under 2 minutes.",
  openGraph: {
    title: "Field Invoice App | TradeBase",
    description: "Invoice from the field. Professional contractor invoices from your phone in under 2 minutes.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Field Invoice App — Invoice From the Job Site, Not From Your Desk"
      subtitle="The best time to send an invoice is when you finish the job. TradeBase makes that possible from any phone, without a laptop or office time."
      problemHeadline="Waiting until you get home costs you money."
      problems={[
        "Invoices delayed until evening, forgotten, or never sent at all",
        "Customers who've mentally moved on by the time the invoice arrives",
        "No record of what was done, what was charged, or when it was sent",
        "Payment arriving 3–4 weeks after work when it should arrive in 3–4 days",
        "No way to invoice without a computer and a template",
      ]}
      solutionHeadline="Invoice before the tools are back in the truck."
      solutionText="TradeBase is a field invoice app — built to be fast on a phone screen while you're still on-site. Your services are saved. Your customers are in the system. You tap the line items, set the amount, and send. The customer gets a professional invoice by email while you're still at the job. That immediacy is why contractors who invoice on-site get paid significantly faster than those who wait."
      features={[
        { icon: "📱", name: "Phone-Optimized", desc: "Every screen designed for one-hand use in the field." },
        { icon: "💾", name: "Saved Services", desc: "Tap to add your most common services — no typing every time." },
        { icon: "📤", name: "One-Tap Send", desc: "Invoice delivered to customer email before you leave the driveway." },
        { icon: "💵", name: "On-Site Payment", desc: "Customer paying now? Log it and close the invoice on the spot." },
        { icon: "🧾", name: "Quote-to-Invoice", desc: "Convert an approved quote to invoice in one tap — no re-entry." },
        { icon: "📊", name: "Instant Dashboard", desc: "See paid and outstanding totals as soon as you open the app." },
        { icon: "🔴", name: "Overdue Alerts", desc: "Overdue invoices surfaced automatically — nothing forgotten." },
        { icon: "👤", name: "Customer Linked", desc: "Every invoice stored under the right customer automatically." },
      ]}
      ctaText="Try the Field Invoice App Free"
      mistakes={[
        "Waiting until you're home to invoice — the moment passes and it often doesn't happen",
        "Texting the total as the invoice — no paper trail, no professional record",
        "Not recording on-site cash payments — 'I already paid that' disputes are avoidable",
        "Using a general invoicing app not built for field use — phone experience matters",
      ]}
      internalLinks={[
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
        { href: "/create-invoice-on-phone", label: "Create Invoice on Phone" },
        { href: "/how-contractors-send-invoices-fast", label: "Send Invoices Fast" },
        { href: "/invoice-app-for-handyman", label: "Invoice App for Handyman" },
        { href: "/free-contractor-invoice-template", label: "Free Invoice Template" },
      ]}
    />
  );
}
