import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Phone App for Contractors | Run Your Business From Your Phone",
  description: "Run your entire contractor business from your phone. Quotes, invoices, jobs, leads, and customers — all from a mobile-first app built for the field.",
  openGraph: {
    title: "Phone App for Contractors | TradeBase",
    description: "Run your contractor business from your phone. Everything you need — quotes, invoices, jobs, customers.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Phone App for Contractors — Run Your Entire Business From Your Phone"
      subtitle="Your phone is already with you on every job. TradeBase turns it into your business office — quotes, invoices, jobs, customers, and payments in one place."
      problemHeadline="Most business apps aren't built for a phone in the field."
      problems={[
        "Desktop-first software with a mobile app that's clunky and hard to use on-site",
        "Business tasks that require getting back to a computer before they can get done",
        "No quote or invoice tool that actually works well on a small phone screen",
        "Admin piling up because it's only possible to do it at home",
        "Separate apps for quoting, invoicing, and scheduling that don't connect",
      ]}
      solutionHeadline="One app, built phone-first, that runs your whole business."
      solutionText="TradeBase was designed from the start to run entirely on a phone. Every screen is optimized for thumb navigation and field use. You can send a quote, create an invoice, update a job status, log a lead, or check your outstanding balance in under a minute — right from the job site. No laptop. No office. No evening admin sessions. Just a clean, fast business tool that lives in your pocket."
      features={[
        { icon: "📱", name: "Mobile-First Design", desc: "Every feature designed for phone use first — not adapted from a desktop app." },
        { icon: "📋", name: "Quotes", desc: "Build and send professional quotes from any job site in minutes." },
        { icon: "🧾", name: "Invoices", desc: "Invoice on-site, the moment the job is done." },
        { icon: "📅", name: "Jobs", desc: "Track every job by status from booked to paid." },
        { icon: "📥", name: "Leads", desc: "Log every inquiry and move it through your pipeline." },
        { icon: "👤", name: "Customers", desc: "Full history per customer — jobs, quotes, invoices, notes." },
        { icon: "💵", name: "Payments", desc: "Log and track every payment. See what's owed at a glance." },
        { icon: "🤖", name: "AI Tools", desc: "Voice-to-job capture, follow-up drafts, and client summaries." },
      ]}
      ctaText="Run My Business From My Phone"
      mistakes={[
        "Using a desktop-first app and expecting it to work well on a phone — the field experience matters",
        "Separate apps for quotes, invoices, and jobs — no data connection, double entry, and wasted time",
        "Doing all admin at home after a full day — it doesn't get done consistently",
        "Not using your phone's existing habits — if you already use your phone for everything, your business app should be there too",
      ]}
      internalLinks={[
        { href: "/best-app-for-small-contractor-business", label: "Best App for Small Contractors" },
        { href: "/small-contractor-business-software", label: "Small Contractor Business Software" },
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
        { href: "/contractor-quote-app", label: "Contractor Quote App" },
        { href: "/job-tracking-for-contractors", label: "Job Tracking" },
      ]}
    />
  );
}
