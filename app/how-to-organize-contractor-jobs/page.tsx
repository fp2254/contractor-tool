import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "How to Organize Contractor Jobs | Simple System | TradeBase",
  description: "A simple system for organizing contractor jobs so nothing gets missed. Track status, notes, and invoices per job from your phone.",
  openGraph: {
    title: "How to Organize Contractor Jobs | TradeBase",
    description: "Simple job organization for contractors. Track every job from booked to paid — all from your phone.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="How to Organize Contractor Jobs — A Simple System That Actually Works"
      subtitle="You don't need complicated project management software. You need a simple system: every job tracked by status, with notes, photos, and invoices in one place."
      problemHeadline="Disorganized jobs cost contractors time and money."
      problems={[
        "Forgetting a scheduled job because it only existed in a text thread",
        "Not knowing which jobs are complete, which are in-progress, and which are waiting",
        "Job details — what was agreed, what was done, what was charged — scattered everywhere",
        "Invoicing from memory because there's no job record to reference",
        "Customers calling to ask for status and you have to piece together what happened",
      ]}
      solutionHeadline="One record per job. Every job tracked by status."
      solutionText="The most effective job organization system for contractors is simple: every job gets its own record with a status, a customer, notes, and a linked invoice. TradeBase does this automatically. When you book a job, it's logged as scheduled. When work starts, it moves to in-progress. When you invoice and get paid, it closes. Nothing falls through. Everything is findable. And every record is tied to the customer so their full history is always one tap away."
      features={[
        { icon: "📅", name: "Status Tracking", desc: "Scheduled, in progress, completed — every job sorted automatically." },
        { icon: "📝", name: "Job Notes", desc: "Add details, materials, access info — anything relevant to the job." },
        { icon: "📸", name: "Photo Logging", desc: "Attach before and after photos directly to the job record." },
        { icon: "👤", name: "Customer Linked", desc: "Every job is connected to the customer automatically." },
        { icon: "🧾", name: "Invoice From Job", desc: "Invoice directly from the job record — no separate step." },
        { icon: "🤖", name: "AI Capture", desc: "Describe a job by voice and AI fills in the details." },
        { icon: "📊", name: "Daily View", desc: "See today's jobs and what's scheduled for the rest of the week." },
        { icon: "📱", name: "Phone-First", desc: "Update jobs, add notes, and check status from anywhere on any phone." },
      ]}
      ctaText="Organize My Jobs Free"
      mistakes={[
        "Using a different system for each type of job — one system for all jobs, always",
        "No notes on the job when it's booked — crucial details forgotten before work starts",
        "Keeping job records in a spreadsheet separate from customer records — they should be linked",
        "Only tracking active jobs — completed jobs should stay on record for warranty and billing reference",
      ]}
      internalLinks={[
        { href: "/job-tracking-for-contractors", label: "Job Tracking for Contractors" },
        { href: "/how-to-track-customers-as-a-contractor", label: "How to Track Customers" },
        { href: "/contractor-crm-simple", label: "Simple CRM for Contractors" },
        { href: "/small-contractor-business-software", label: "Small Contractor Business Software" },
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
      ]}
    />
  );
}
