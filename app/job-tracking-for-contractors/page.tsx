import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Job Tracking for Contractors | TradeBase",
  description: "Track every job from scheduled to complete. See what's active, what's coming up, and what needs attention — all from your phone.",
  openGraph: {
    title: "Job Tracking for Contractors | TradeBase",
    description: "Track contractor jobs from scheduled to complete. Simple job management built for the field.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Job Tracking for Contractors — Know Exactly Where Every Job Stands"
      subtitle="See every active, scheduled, and completed job without digging through texts or calling your crew. Job tracking built for a phone, not a project manager."
      problemHeadline="Jobs slip through the cracks when there's no system."
      problems={[
        "Not knowing what jobs are scheduled next week without calling around",
        "A job started but never invoiced because it got lost in the shuffle",
        "Customer calls to ask about their job status and you have to piece it together",
        "No way to see which jobs are complete vs. which need a follow-up visit",
        "Job notes living in someone's head instead of somewhere the whole team can see",
      ]}
      solutionHeadline="Every job in one place, organized by status."
      solutionText="TradeBase tracks every job from the moment it's booked to the moment it's paid. Each job has a status — scheduled, in progress, completed — so you always have a clear picture of what's happening. Notes, photos, customer info, and linked invoices are all attached to the job record. Your whole schedule is visible in one list without spreadsheets, whiteboards, or calendar juggling."
      features={[
        { icon: "📅", name: "Job Status Board", desc: "Scheduled, in progress, completed — every job sorted by status at a glance." },
        { icon: "📝", name: "Job Notes", desc: "Notes per job — visible to your whole team, always accessible." },
        { icon: "👤", name: "Customer Linked", desc: "Every job tied to the customer record automatically." },
        { icon: "🧾", name: "Linked Invoicing", desc: "Invoice directly from the job record when the work is done." },
        { icon: "📸", name: "Photo Logging", desc: "Attach job photos to the record — before, during, and after." },
        { icon: "🤖", name: "AI Job Capture", desc: "Describe the job by voice and AI fills in the details automatically." },
        { icon: "📊", name: "Daily Ops View", desc: "See today's jobs and what's coming tomorrow in a single view." },
        { icon: "📱", name: "Field-Ready", desc: "Fast on a phone. Update job status from anywhere." },
      ]}
      ctaText="Track My Jobs Free"
      mistakes={[
        "Using a whiteboard or sticky notes for job tracking — fine for two jobs, chaotic for ten",
        "No start or completion date recorded — makes billing and scheduling harder than it needs to be",
        "Job notes only in the crew's head — when someone's out, nothing is findable",
        "Tracking jobs and invoices in separate places — they should always be connected",
      ]}
      internalLinks={[
        { href: "/how-to-organize-contractor-jobs", label: "How to Organize Contractor Jobs" },
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
        { href: "/contractor-quote-app", label: "Contractor Quote App" },
        { href: "/small-contractor-business-software", label: "Small Contractor Business Software" },
        { href: "/how-to-track-customers-as-a-contractor", label: "How to Track Customers" },
      ]}
    />
  );
}
