import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Simple CRM for Contractors | No Complexity | TradeBase",
  description: "A simple contractor CRM that actually gets used. Track customers, jobs, leads, and follow-ups from your phone without complicated setup.",
  openGraph: {
    title: "Simple CRM for Contractors | TradeBase",
    description: "Simple contractor CRM. Customer tracking, job history, and follow-ups — all from your phone.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Simple CRM for Contractors — Customer Tracking Without the Complexity"
      subtitle="Most CRMs are built for sales teams. TradeBase is built for contractors who need to track customers, jobs, and follow-ups from a phone — simply."
      problemHeadline="Contractor CRMs that are too complicated don't get used."
      problems={[
        "Generic CRM software with pipeline stages built for software salespeople, not contractors",
        "Complex setup that takes weeks before there's any value",
        "No mobile app that actually works well in the field",
        "Customer records disconnected from jobs and invoices",
        "A system so complicated that everyone reverts to text messages and memory",
      ]}
      solutionHeadline="A contractor CRM simple enough to actually use every day."
      solutionText="TradeBase gives contractors a simple customer tracking system that connects directly to quotes, jobs, and invoices. Every customer has a profile with their full history. Every lead is tracked through your pipeline. Every quote and job is attached to the right customer automatically. You can pull up a customer's full history in seconds from your phone. No training required. No complicated workflows. Just a clean, simple record of every person you've ever worked with."
      features={[
        { icon: "👤", name: "Customer Profiles", desc: "Full record per customer — contact info, jobs, quotes, invoices, notes." },
        { icon: "📥", name: "Lead Pipeline", desc: "Track every inquiry from first contact to booked job." },
        { icon: "🔔", name: "Follow-up System", desc: "Reminders to follow up on open quotes and past customers." },
        { icon: "📊", name: "Customer Overview", desc: "See your full customer base — who owes, who's active, who needs a call." },
        { icon: "📤", name: "Customer Portal", desc: "Branded portal for customers to view quotes, sign, and review invoices." },
        { icon: "🤖", name: "AI Summaries", desc: "AI generates a quick briefing on any customer before a call or visit." },
        { icon: "📋", name: "Linked Quotes & Jobs", desc: "Every quote and job tied to the customer automatically — no manual linking." },
        { icon: "📱", name: "Mobile-First", desc: "Designed for the field. Fast on a phone. No desktop required." },
      ]}
      ctaText="Try the Simple CRM Free"
      mistakes={[
        "Using a sales CRM for a contractor business — wrong workflow, wrong vocabulary, poor fit",
        "Tracking customers and jobs in separate systems — they should always be connected",
        "Skipping CRM entirely and using memory — fine for 10 customers, chaotic for 50",
        "Buying a CRM with features you'll never use — pay for what you actually need",
      ]}
      internalLinks={[
        { href: "/contractor-crm", label: "Contractor CRM Overview" },
        { href: "/how-to-track-customers-as-a-contractor", label: "How to Track Customers" },
        { href: "/job-tracking-for-contractors", label: "Job Tracking" },
        { href: "/how-to-organize-contractor-jobs", label: "How to Organize Jobs" },
        { href: "/small-contractor-business-software", label: "Small Contractor Business Software" },
      ]}
    />
  );
}
