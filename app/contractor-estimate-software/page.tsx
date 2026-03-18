import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Contractor Estimate Software – Fast, Professional Estimates | TradeBase",
  description: "TradeBase is contractor estimate software for building professional estimates on your phone, sending them for signature, and converting them to jobs.",
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Contractor Estimate Software That Gets You to Yes Faster"
      subtitle="Build detailed, professional estimates from your phone on any job site. Send a link, get a signature, and convert to a job — without paperwork or delays."
      problemHeadline="Estimates written slowly or inconsistently cost contractors real money."
      problems={[
        "Spending evenings writing estimates that should take 10 minutes",
        "Inconsistent formats that look unprofessional",
        "No warranty or terms included — just a number",
        "Customers losing the emailed PDF and asking for it again",
        "Approved estimates with no clear written record",
      ]}
      solutionHeadline="Professional estimates. On-site. In minutes."
      solutionText="TradeBase lets you walk a job, open the app, and build a detailed estimate with labor, materials, scope of work, warranty terms, and your business name — right from the customer's driveway. Send a link. They open it, read through it, and sign. You have a time-stamped record and can start the job the same day."
      features={[
        { icon: "📋", name: "Mobile Estimate Builder", desc: "Line items, quantities, unit prices, and totals — built on your phone." },
        { icon: "📦", name: "Service Presets", desc: "Save common services with prices and add them in one tap per estimate." },
        { icon: "🤖", name: "AI Scope Writer", desc: "Add your items and AI writes a complete professional scope of work." },
        { icon: "⚖️", name: "Warranty Terms", desc: "Add your standard warranty clauses automatically to every estimate." },
        { icon: "✍️", name: "Digital Signatures", desc: "Customers sign from their phone through your customer portal." },
        { icon: "📤", name: "Customer Portal", desc: "Branded link — customer reviews and signs without needing an account." },
        { icon: "🔨", name: "Convert to Job", desc: "One tap turns an approved estimate into a scheduled job." },
        { icon: "💬", name: "Follow-up Drafter", desc: "No response in a week? AI drafts a professional follow-up for you." },
        { icon: "📱", name: "Phone-First", desc: "Designed for mobile. Fast enough to use while standing on the job site." },
      ]}
      ctaText="Write Faster Estimates"
    />
  );
}
