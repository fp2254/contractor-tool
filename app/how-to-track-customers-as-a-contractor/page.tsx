import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "How to Track Customers as a Contractor | TradeBase",
  description: "Simple customer tracking for contractors. Keep a record of every customer, their job history, and what they owe — all from your phone.",
  openGraph: {
    title: "How to Track Customers as a Contractor | TradeBase",
    description: "Simple customer tracking for contractors. Full history per customer — jobs, quotes, invoices, and payments.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="How to Track Customers as a Contractor — Without a CRM Degree"
      subtitle="Every contractor needs a way to find customer history, know who owes money, and follow up at the right time. Here's the simplest system that works."
      problemHeadline="Most contractors have no real customer tracking system."
      problems={[
        "Customer history living in texts, emails, and your own memory",
        "No way to quickly know what you charged someone for work done 8 months ago",
        "Missing follow-up opportunities because there's no system to prompt you",
        "Not knowing which customers haven't hired you in a while — referrals going unasked",
        "Phone number only in your contacts app — no job history, no invoice history attached",
      ]}
      solutionHeadline="One record per customer. Everything attached to it automatically."
      solutionText="TradeBase creates a customer profile the moment you add them. Every quote, job, invoice, and payment is linked to that customer automatically — no manual filing. When a customer calls, you can pull up their full history in seconds: what jobs you've done, what was charged, what's been paid, and any notes you've left. That's the level of organization that wins repeat business and makes you look professional every time."
      features={[
        { icon: "👤", name: "Customer Profiles", desc: "Name, contact info, and every job, quote, invoice, and payment in one place." },
        { icon: "📋", name: "Full History", desc: "Every interaction with a customer logged and easy to find." },
        { icon: "📊", name: "Outstanding Balance", desc: "See immediately what a customer owes across all invoices." },
        { icon: "📥", name: "Lead Tracking", desc: "Leads move through a pipeline to a booked job and then to a customer." },
        { icon: "📤", name: "Customer Portal", desc: "Branded portal where customers can view their quotes and invoices." },
        { icon: "🔔", name: "Follow-up System", desc: "Reminders to follow up on open quotes and check in with past customers." },
        { icon: "🤖", name: "AI Summaries", desc: "AI generates a quick summary of a customer before every call or visit." },
        { icon: "📱", name: "Mobile-First", desc: "Pull up any customer record from the field in seconds." },
      ]}
      ctaText="Try Customer Tracking Free"
      mistakes={[
        "Relying on your phone's contacts app — no job history, no invoice history, no notes",
        "Entering customer info in multiple places — one record, always, for every customer",
        "Not noting special instructions or access info — forgetting these costs time on every return visit",
        "No proactive follow-up — customers who hear from you go back to you. Those who don't, don't.",
      ]}
      internalLinks={[
        { href: "/contractor-crm-simple", label: "Simple CRM for Contractors" },
        { href: "/contractor-crm", label: "Contractor CRM" },
        { href: "/job-tracking-for-contractors", label: "Job Tracking" },
        { href: "/how-to-organize-contractor-jobs", label: "How to Organize Jobs" },
        { href: "/small-contractor-business-software", label: "Small Contractor Business Software" },
      ]}
    />
  );
}
