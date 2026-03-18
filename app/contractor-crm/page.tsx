import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Contractor CRM – Manage Leads, Customers & Jobs | TradeBase",
  description: "TradeBase is a contractor CRM built for the trade. Manage leads, track customer history, schedule jobs, and follow up — all from your phone.",
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="A Contractor CRM That Works in the Field, Not Just the Office"
      subtitle="Track every lead, follow up on every quote, and keep a complete history of every customer — without complicated software or a dedicated office manager."
      problemHeadline="Most contractor 'systems' aren't systems at all."
      problems={[
        "Leads come in by text, call, and email with no single place to track them",
        "Follow-ups forgotten because there's no reminder",
        "Customer history spread across old invoices, texts, and memory",
        "No way to see which customers haven't heard from you in months",
        "Sales pipeline that lives entirely in someone's head",
      ]}
      solutionHeadline="A CRM built for how contractors actually work."
      solutionText="TradeBase isn't generic business software with contractor features bolted on — it was built from scratch for contractors. Every lead gets logged. Every customer has a record. Every quote, job, and invoice is tied together. You can follow up on open quotes, see who owes money, and know exactly what's happening across your whole business from your phone."
      features={[
        { icon: "📥", name: "Lead Tracking", desc: "Log every inquiry — call, referral, web form — and move them through your pipeline." },
        { icon: "👤", name: "Customer Profiles", desc: "Full history per customer — jobs, quotes, invoices, payments, and notes." },
        { icon: "📋", name: "Quote Tracking", desc: "See which quotes are out, which were approved, and which need a follow-up." },
        { icon: "🔨", name: "Job Pipeline", desc: "Track every active job by status so nothing gets dropped." },
        { icon: "💬", name: "AI Follow-ups", desc: "AI drafts professional follow-up messages for stale quotes and overdue invoices." },
        { icon: "📱", name: "Mobile-First", desc: "Designed for a phone screen. Fast and usable in the field." },
        { icon: "🤖", name: "Client Intel", desc: "Get an AI summary of a customer before every call or site visit." },
        { icon: "📊", name: "Business Overview", desc: "Dashboard with unpaid totals, leads count, jobs today, and sent quotes." },
        { icon: "📤", name: "Customer Portal", desc: "Branded portal for customers to view quotes, sign, and review invoices." },
      ]}
      ctaText="Get Your CRM"
    />
  );
}
