import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Free Contractor Invoice Template | TradeBase",
  description: "Stop using Word docs. TradeBase gives you a built-in invoice builder that creates professional invoices from your phone in under 2 minutes.",
  openGraph: {
    title: "Free Contractor Invoice Template | TradeBase",
    description: "Better than a template — a real invoice builder for contractors. Free to try.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Free Contractor Invoice Template — Or Skip the Template Entirely"
      subtitle="Templates are a start. But a real invoice app built for contractors saves you 30 minutes a week and gets you paid faster than any Word doc."
      problemHeadline="The problem with invoice templates for contractors."
      problems={[
        "Word and Excel templates are painful on a phone screen",
        "Every job requires manually updating the template from scratch",
        "No running total of what's paid vs outstanding — you have to calculate it yourself",
        "Templates don't send follow-up reminders or flag overdue balances",
        "Customer name, address, and contact info has to be retyped every time",
      ]}
      solutionHeadline="A better option than any template — a real invoice builder."
      solutionText="TradeBase is free to try and gives you a built-in invoice builder that works from your phone. Your customers are saved. Your services are saved. You pick the customer, tap the services, set the total, and send — every time, in about 90 seconds. Every invoice is stored under the right customer automatically. You get a real payment dashboard instead of a spreadsheet you have to update by hand."
      features={[
        { icon: "🧾", name: "Built-In Invoice Builder", desc: "No template needed — build professional invoices directly in the app." },
        { icon: "💾", name: "Saved Customers", desc: "Customer info saved once. Never retype a name or address." },
        { icon: "📋", name: "Service Library", desc: "Save your most common services and prices. Add with one tap." },
        { icon: "📤", name: "Email Direct", desc: "Invoice sent from the app directly to the customer." },
        { icon: "💵", name: "Payment Tracking", desc: "Log payments and see your outstanding balance in real time." },
        { icon: "🔴", name: "Overdue Flags", desc: "Overdue invoices are surfaced automatically — no spreadsheet needed." },
        { icon: "📊", name: "Revenue Dashboard", desc: "See total paid, unpaid, and overdue without digging through files." },
        { icon: "📱", name: "Mobile-First", desc: "Designed for phone use. Faster than any desktop template." },
      ]}
      ctaText="Try It Free — No Template Needed"
      mistakes={[
        "Using a shared Google Doc template — version control breaks down fast with multiple jobs",
        "Starting from a blank invoice every time — costs 10+ extra minutes per invoice",
        "No due date on the invoice — customers treat undated invoices as optional",
        "Sending invoices as PDF attachments from a personal email — looks unprofessional",
      ]}
      internalLinks={[
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
        { href: "/create-invoice-on-phone", label: "Create an Invoice on Your Phone" },
        { href: "/estimate-template-for-contractors", label: "Estimate Template for Contractors" },
        { href: "/how-contractors-send-invoices-fast", label: "How to Send Invoices Fast" },
        { href: "/field-invoice-app", label: "Field Invoice App" },
      ]}
    />
  );
}
