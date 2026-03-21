import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "App for Plumbers | Quotes, Invoices & Jobs | TradeBase",
  description: "Plumbing business software built for the field. Send quotes fast, invoice on-site, and track every customer and job from your phone.",
  openGraph: {
    title: "App for Plumbers | TradeBase",
    description: "Run your plumbing business from your phone. Quotes, invoices, and job tracking in one app.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Plumbing Business App — Run It All From Your Phone"
      subtitle="Quote jobs on-site, invoice before you pack up, and keep a clean record of every customer and job. Built for plumbers who work alone or with a small crew."
      problemHeadline="Most plumbers are great at the work — not the paperwork."
      problems={[
        "Writing quotes on paper or in texts that customers can dispute later",
        "Invoices sitting unsent because you forgot when you got home",
        "No easy way to know which customer still owes you money",
        "Job details living in your head instead of somewhere you can find them",
        "Chasing down payments a month after the job wrapped up",
      ]}
      solutionHeadline="Business software plumbers actually use."
      solutionText="TradeBase is designed for plumbers who spend their day in the field, not behind a desk. Build a quote using your standard services, send it right from the job site, and convert it to an invoice the moment the work is done. Every customer has a full history. You always know what's paid, what's outstanding, and what's scheduled next."
      features={[
        { icon: "📋", name: "Service Presets", desc: "Save your standard plumbing services so building a quote takes seconds." },
        { icon: "🧾", name: "On-Site Invoicing", desc: "Invoice while you're still at the job — not from home hours later." },
        { icon: "💵", name: "Payment Logging", desc: "Record cash, check, or digital payments and see your outstanding balance." },
        { icon: "👤", name: "Customer History", desc: "Every job, quote, and invoice for every customer, always accessible." },
        { icon: "📥", name: "Lead Management", desc: "Track every call and referral through your pipeline to a booked job." },
        { icon: "📅", name: "Scheduling", desc: "See what jobs are coming up so you can plan your week." },
        { icon: "📱", name: "Mobile-First", desc: "Works on any phone. No app store download required." },
        { icon: "🤖", name: "AI Follow-ups", desc: "Get AI-drafted follow-ups for quotes that haven't been answered." },
      ]}
      ctaText="Run My Plumbing Business"
      mistakes={[
        "Not getting approval in writing before starting work — verbal agreements lead to disputes",
        "Waiting until month-end to send invoices — customers forget the job details and push back",
        "Using the same generic invoice for every job — specific line items get paid faster",
        "No system for tracking which customers haven't hired you in a while — referrals get missed",
      ]}
      internalLinks={[
        { href: "/invoice-app-for-plumbers", label: "Invoice App for Plumbers" },
        { href: "/plumbing-business-software", label: "Plumbing Business Software" },
        { href: "/contractor-quote-app", label: "Contractor Quote App" },
        { href: "/job-tracking-for-contractors", label: "Job Tracking" },
        { href: "/how-contractors-send-invoices-fast", label: "How to Send Invoices Fast" },
      ]}
    />
  );
}
