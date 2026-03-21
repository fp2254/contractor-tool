import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "App for General Contractors | Manage Jobs & Invoices | TradeBase",
  description: "General contractor business software. Manage multiple jobs, send quotes, invoice customers, and track subs — all from your phone.",
  openGraph: {
    title: "App for General Contractors | TradeBase",
    description: "Manage quotes, jobs, invoices, and customers across multiple projects from your phone.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="General Contractor App — Manage Multiple Jobs Without the Chaos"
      subtitle="Track open bids, active projects, invoices, and customers in one place. Built for GCs running a few jobs at a time without a full office team."
      problemHeadline="Managing multiple jobs with no real system is exhausting."
      problems={[
        "Bids and quotes scattered across email, text, and handwritten notes",
        "No clear view of which jobs are active, complete, or waiting",
        "Invoices delayed or missed because jobs overlap",
        "Subs and customers asking for documents you have to dig for",
        "Revenue picture unclear because payments aren't tracked properly",
      ]}
      solutionHeadline="One tool to manage your whole operation from the field."
      solutionText="TradeBase gives general contractors a clear view of everything running at once. Every job has its own record — status, customer, notes, quotes, and invoices. You can see which jobs are active, what's been invoiced, and what's still outstanding. Build quotes fast using saved line items, send them for approval, and invoice on schedule. No complicated project management software. No steep learning curve."
      features={[
        { icon: "🏗️", name: "Multi-Job View", desc: "See all active jobs by status without digging through folders." },
        { icon: "📋", name: "Detailed Quoting", desc: "Build line-item estimates with labor, materials, and markup." },
        { icon: "🧾", name: "Progress Invoicing", desc: "Invoice by milestone or on completion — your choice." },
        { icon: "💵", name: "Payment Tracking", desc: "See every deposit, payment, and outstanding balance at a glance." },
        { icon: "👤", name: "Customer Profiles", desc: "Full history per client — every job, quote, invoice, and note." },
        { icon: "📥", name: "Lead Tracking", desc: "Manage bids from inquiry through contract." },
        { icon: "📤", name: "Customer Portal", desc: "Share proposals for online review and signature." },
        { icon: "📱", name: "Mobile-First", desc: "Fast on a phone. No desktop required." },
      ]}
      ctaText="Try It Free"
      mistakes={[
        "Starting a job without a signed quote — verbal agreements fall apart on change orders",
        "Mixing personal and business accounts — makes tax season and job costing a nightmare",
        "Invoicing at project end only — cash flow problems stack up mid-project",
        "No written notes on job details — memory fails when customers ask questions months later",
      ]}
      internalLinks={[
        { href: "/job-tracking-for-contractors", label: "Job Tracking for Contractors" },
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
        { href: "/contractor-quote-app", label: "Contractor Quote App" },
        { href: "/how-to-organize-contractor-jobs", label: "How to Organize Contractor Jobs" },
        { href: "/small-contractor-business-software", label: "Small Contractor Business Software" },
      ]}
    />
  );
}
