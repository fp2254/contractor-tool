import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Small Contractor Business Software | Simple & Mobile | TradeBase",
  description: "Simple business software for small contractors. Quotes, invoices, jobs, and customer tracking from your phone. No big setup, no steep price.",
  openGraph: {
    title: "Small Contractor Business Software | TradeBase",
    description: "Business software built for small contractors. Simple, mobile-first, and affordable.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Business Software for Small Contractors — Simple, Affordable, Phone-First"
      subtitle="You don't need enterprise software to run a clean contractor business. TradeBase gives solo contractors and small crews the tools to look professional and stay organized."
      problemHeadline="Most contractor software is too expensive, too complicated, or both."
      problems={[
        "Software designed for 20-person companies with pricing to match",
        "Setup and onboarding that takes a week before you get any value",
        "Desktop-first design that's clunky and slow on a phone",
        "Features you'll never use bundled in to justify the price",
        "No good option between a spreadsheet and a full enterprise system",
      ]}
      solutionHeadline="The right fit for a small contractor operation."
      solutionText="TradeBase is built specifically for contractors with one to five trucks — the owner-operator or small crew that needs a professional system without the overhead of an enterprise product. Quotes, invoices, job tracking, lead management, and customer records — all the essentials, nothing extra, all from a phone. Setup takes minutes, not days, and you'll be sending your first professional quote the same day you start."
      features={[
        { icon: "📋", name: "Quoting", desc: "Professional quotes sent from the field in under 2 minutes." },
        { icon: "🧾", name: "Invoicing", desc: "Invoice on-site immediately when the job is done." },
        { icon: "📅", name: "Job Tracking", desc: "Every job tracked by status. Nothing falls through." },
        { icon: "📥", name: "Lead Management", desc: "Log every inquiry and track it through to a booked job." },
        { icon: "👤", name: "Customer Records", desc: "Full history per customer — every job, quote, and invoice." },
        { icon: "💵", name: "Payment Tracking", desc: "See paid, unpaid, and overdue at a glance." },
        { icon: "🤖", name: "AI Tools", desc: "AI job capture from voice notes, follow-up drafts, and client summaries." },
        { icon: "📱", name: "Phone-First", desc: "Built for contractors who work in the field, not behind a desk." },
      ]}
      ctaText="Try It Free Today"
      mistakes={[
        "Paying for enterprise software as a solo contractor — you don't need 90% of those features",
        "Using five different apps for different parts of the business — they should all be in one place",
        "Treating admin as optional — disorganized admin costs you jobs, referrals, and time",
        "Waiting until you 'grow into' needing a system — start organized, not catch-up organized",
      ]}
      internalLinks={[
        { href: "/best-app-for-small-contractor-business", label: "Best App for Small Contractor Business" },
        { href: "/phone-app-for-contractors", label: "Phone App for Contractors" },
        { href: "/contractor-crm-simple", label: "Simple CRM for Contractors" },
        { href: "/job-tracking-for-contractors", label: "Job Tracking" },
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
      ]}
    />
  );
}
