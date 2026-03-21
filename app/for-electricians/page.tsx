import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "App for Electricians | Quotes & Invoices | TradeBase",
  description: "Electrical contractor software built for the field. Send quotes, create invoices on-site, and track jobs from your phone.",
  openGraph: {
    title: "App for Electricians | TradeBase",
    description: "Electrical contractor software. Send quotes and invoices from your phone — no office needed.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Electrical Contractor App — Quote, Invoice, and Track Jobs From Your Phone"
      subtitle="Send professional estimates before you leave the driveway, invoice on-site when the job is done, and track every customer and job without spreadsheets."
      problemHeadline="Electrical contractors lose money on admin, not on the work."
      problems={[
        "Quotes written on a legal pad that customers can say they never received",
        "Invoices delayed because you forgot to write it up when you got home",
        "No system to track which jobs are paid, pending, or overdue",
        "Customer history spread across texts, email, and memory",
        "Spending weekend hours catching up on paperwork instead of resting",
      ]}
      solutionHeadline="Built for electricians who work in the field, not in an office."
      solutionText="TradeBase gives you a fast, professional way to handle the business side of electrical work without slowing you down. Save your standard service rates once, build a quote in minutes, send it from the job site, and turn it into an invoice the moment the panel is closed up. You'll always know what's owed, what's scheduled, and who needs a follow-up."
      features={[
        { icon: "⚡", name: "Fast Quotes", desc: "Build estimates using saved service presets. No starting from scratch each time." },
        { icon: "🧾", name: "Instant Invoicing", desc: "Convert approved quotes to invoices with one tap." },
        { icon: "💵", name: "Payment Records", desc: "Log every payment and see exactly what's outstanding at any time." },
        { icon: "👤", name: "Customer Profiles", desc: "Complete history per customer — every job, quote, and invoice." },
        { icon: "📅", name: "Job Tracking", desc: "See scheduled, active, and completed jobs without digging through notes." },
        { icon: "📥", name: "Lead Pipeline", desc: "Track inquiries from first call to booked job." },
        { icon: "📤", name: "Customer Portal", desc: "Customers can view, approve, and sign quotes online." },
        { icon: "📱", name: "Phone-First", desc: "Works on iPhone or Android. No desktop required." },
      ]}
      ctaText="Try It Free"
      mistakes={[
        "Not itemizing labor and materials separately — customers ask fewer questions with detailed invoices",
        "Forgetting to follow up on open quotes — a short follow-up message closes more jobs",
        "Collecting payment cash only with no receipt — creates disputes and no paper trail",
        "Not tracking permit or inspection dates — missed deadlines cost real money",
      ]}
      internalLinks={[
        { href: "/invoice-app-for-electricians", label: "Invoice App for Electricians" },
        { href: "/electrician-business-software", label: "Electrician Business Software" },
        { href: "/contractor-estimating-app", label: "Estimating App for Contractors" },
        { href: "/job-tracking-for-contractors", label: "Job Tracking" },
        { href: "/how-to-send-an-estimate-from-phone", label: "How to Send Estimates From Your Phone" },
      ]}
    />
  );
}
