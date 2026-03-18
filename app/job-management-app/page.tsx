import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Job Management App for Contractors – Schedule, Track & Close Jobs | TradeBase",
  description: "TradeBase is a job management app for contractors. Schedule jobs, track progress, attach photos, and close out work — all from your phone.",
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="A Job Management App Built for Contractors in the Field"
      subtitle="Schedule jobs, track their status, attach photos, add notes, and close out work — from your phone, without a whiteboard or spreadsheet."
      problemHeadline="Tracking jobs through texts and memory is costing you money."
      problems={[
        "Jobs scheduled but no record of when or where",
        "Not knowing which jobs are in progress vs. waiting on materials",
        "Photos and notes from the job scattered across different apps",
        "Customers calling to ask about the status of their project",
        "Closing out jobs without a clear record of what was done",
      ]}
      solutionHeadline="Every job — visible, tracked, and closed out properly."
      solutionText="TradeBase gives you a job board that shows everything in progress — scheduled, active, on hold, complete. Each job has its own record: notes, photos, the customer's info, the quote it came from, and the invoice it becomes. You know exactly where every job stands, all the time."
      features={[
        { icon: "🔨", name: "Job Board", desc: "All active jobs in one view — status, customer, and schedule at a glance." },
        { icon: "📅", name: "Scheduling", desc: "Set start dates and assign job status so your week stays organized." },
        { icon: "📸", name: "Photos & Notes", desc: "Attach site photos and internal notes to every job record." },
        { icon: "📋", name: "Quote → Job", desc: "When a quote is approved, convert it to a job with one tap." },
        { icon: "💵", name: "Job → Invoice", desc: "Convert a completed job to an invoice in seconds." },
        { icon: "📱", name: "Daily Ops Board", desc: "See your day at a glance — what's scheduled, what's behind, what needs attention." },
        { icon: "👤", name: "Customer Tied", desc: "Every job is linked to the customer — history, contact, and documents." },
        { icon: "🤖", name: "AI Job Capture", desc: "Describe a new job by voice and TradeBase logs all the details." },
        { icon: "📤", name: "Customer Updates", desc: "Send a portal link so customers can track their project without calling." },
      ]}
      ctaText="Track Your Jobs Better"
    />
  );
}
