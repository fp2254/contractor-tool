import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Quote Software for Contractors – Fast, Professional Estimates | TradeBase",
  description: "TradeBase is quote software for contractors. Build professional estimates on your phone, send them for signature, and win more jobs.",
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Quote Software for Contractors That Closes Jobs Faster"
      subtitle="Build a professional estimate on your phone in minutes. Send a link for the customer to review, sign, and approve — without printing or chasing emails."
      problemHeadline="Slow quotes lose jobs. Most contractors quote too slow."
      problems={[
        "Writing estimates at night after the kids are in bed",
        "Customers calling to ask if the quote is ready",
        "No consistent format — every quote looks different",
        "Customers printing, signing, and faxing back documents",
        "Approved quotes with no clear record of what was agreed on",
      ]}
      solutionHeadline="Quote it on site. Get it signed the same day."
      solutionText="TradeBase lets you build a quote right from the customer's driveway — add your line items, write the scope, set your price, and text them a link. They open it on their phone, review the details, and sign. You get a timestamped record and can convert it to a job immediately. No paper. No delays."
      features={[
        { icon: "📋", name: "Mobile Quote Builder", desc: "Add line items, quantities, and prices from your phone in minutes." },
        { icon: "✍️", name: "Digital Signatures", desc: "Customers sign quotes from their phone through the customer portal." },
        { icon: "🤖", name: "AI Scope Generator", desc: "Add your items and let AI generate a professional scope of work." },
        { icon: "📦", name: "Service Presets", desc: "Save your common services with prices. Add them to a quote in one tap." },
        { icon: "⚖️", name: "Terms & Warranty", desc: "Add your standard warranty clauses to every quote automatically." },
        { icon: "📤", name: "Customer Portal", desc: "Customer gets a branded link — no account, no app, no printing." },
        { icon: "🔨", name: "Quote → Job", desc: "Convert an approved quote to a job with one tap." },
        { icon: "💬", name: "AI Follow-up", desc: "No response after a week? AI drafts a follow-up message." },
        { icon: "📱", name: "Phone-First", desc: "Built for a phone. Fast enough to use standing in a driveway." },
      ]}
      ctaText="Quote Faster"
    />
  );
}
