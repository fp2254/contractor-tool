import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Best App for Small Contractor Business | TradeBase",
  description: "Looking for the best app to run your small contractor business? TradeBase handles quotes, invoices, jobs, and customers from your phone — no office needed.",
  openGraph: {
    title: "Best App for Small Contractor Business | TradeBase",
    description: "Run your small contractor business from your phone. Quotes, invoices, jobs, and customers in one simple app.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="The Best App for Running a Small Contractor Business From Your Phone"
      subtitle="You don't need expensive software or a full-time office person. TradeBase gives solo contractors and small crews everything needed to run a clean, professional business from a phone."
      problemHeadline="Most contractor apps are built for bigger companies."
      problems={[
        "Expensive subscriptions built for 10-person companies with features you'll never use",
        "Complicated setup that takes days before you get value from it",
        "Designed for desktop computers — unusable on a phone in the field",
        "Requires importing contacts, syncing calendars, and integration setup before any real use",
        "Training videos and onboarding calls instead of just getting started",
      ]}
      solutionHeadline="Built specifically for small contractors and owner-operators."
      solutionText="TradeBase is designed for contractors running one to five trucks who want to look professional, get paid faster, and stop losing track of jobs and customers. You can be sending your first quote within five minutes of starting. There's nothing to install, no complicated setup, and no features you'll never need. Just the core tools that make a contractor business run: quotes, invoices, jobs, leads, customers, and payments."
      features={[
        { icon: "📋", name: "Quoting", desc: "Professional quotes sent from the field in under 2 minutes." },
        { icon: "🧾", name: "Invoicing", desc: "Invoice on-site the moment the job is done." },
        { icon: "📅", name: "Job Tracking", desc: "Every job tracked by status so nothing falls through the cracks." },
        { icon: "📥", name: "Lead Management", desc: "Every inquiry logged and followed through to a booked job." },
        { icon: "👤", name: "Customer Records", desc: "Complete history per customer — jobs, quotes, invoices, payments." },
        { icon: "💵", name: "Payment Tracking", desc: "See what's paid and what's owed without a spreadsheet." },
        { icon: "🤖", name: "AI Assist", desc: "AI captures job details from a voice note and drafts follow-up messages." },
        { icon: "📱", name: "Phone-First", desc: "Built to run entirely from a phone. No laptop or office required." },
      ]}
      ctaText="Try It Free"
      mistakes={[
        "Paying $80–150/month for software built for a 20-person company — you're funding features you'll never use",
        "Using separate apps for quoting, invoicing, and scheduling — data is everywhere, nothing connects",
        "Thinking you're too small to need a system — messy admin costs you jobs and referrals",
        "Starting with the most expensive option instead of trying something first",
      ]}
      internalLinks={[
        { href: "/small-contractor-business-software", label: "Small Contractor Business Software" },
        { href: "/phone-app-for-contractors", label: "Phone App for Contractors" },
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
        { href: "/contractor-quote-app", label: "Contractor Quote App" },
        { href: "/job-tracking-for-contractors", label: "Job Tracking" },
      ]}
    />
  );
}
