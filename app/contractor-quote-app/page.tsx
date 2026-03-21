import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Contractor Quote App | Send Quotes From Your Phone | TradeBase",
  description: "The fastest contractor quote app. Build and send professional quotes from your phone, get them approved online, and convert to invoices in one tap.",
  openGraph: {
    title: "Contractor Quote App | TradeBase",
    description: "Build and send professional quotes from your phone. No laptop needed.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Contractor Quote App — Send Professional Quotes Before You Leave the Site"
      subtitle="Build a line-item quote on your phone, send it right from the job, get it approved online, and convert it to an invoice when the work is done."
      problemHeadline="Contractors that quote slow win fewer jobs."
      problems={[
        "Estimates written in Notes or on paper — no paper trail, no tracking",
        "Hours between the site visit and the quote hitting the customer's inbox",
        "No system to know which quotes are out, which need a follow-up, and which were lost",
        "Retyping the same services and prices on every single quote",
        "Quotes that never convert to invoices — double entry and forgotten jobs",
      ]}
      solutionHeadline="Quote faster. Win more jobs. Invoice without the double entry."
      solutionText="TradeBase lets you build a complete, professional quote on any phone and send it the moment you finish the site walk. Your services and prices are saved — just tap what applies, add any custom items, and hit send. Customers approve online. You get a notification. When the job's done, convert the approved quote to an invoice in one tap — no re-entering anything."
      features={[
        { icon: "📋", name: "Fast Quote Builder", desc: "Build a full itemized quote in under two minutes from saved services." },
        { icon: "📤", name: "Instant Delivery", desc: "Quote sent to customer email from the field — not from your desk tonight." },
        { icon: "✅", name: "Online Approval", desc: "Customers review and approve from their phone — no printing or fax." },
        { icon: "📊", name: "Quote Pipeline", desc: "Open, approved, and declined — see where every quote stands." },
        { icon: "🔔", name: "Follow-up System", desc: "Reminders to follow up on open quotes so no job goes cold." },
        { icon: "🧾", name: "One-Tap to Invoice", desc: "Approved quote converts to invoice instantly — no re-entry." },
        { icon: "👤", name: "Tied to Customer", desc: "Every quote is linked to the customer record automatically." },
        { icon: "📱", name: "Phone-First", desc: "Designed to be fast on a phone screen. No desktop required." },
      ]}
      ctaText="Try the Quote App Free"
      mistakes={[
        "Quoting verbally on the phone and calling it done — nothing to show when the customer disputes the price",
        "Sending one quote and never following up — one follow-up closes most open quotes",
        "No expiry on the quote — prices change and you're locked in if you don't set a limit",
        "Re-entering quote line items when invoicing — wastes time and creates errors",
      ]}
      internalLinks={[
        { href: "/contractor-estimating-app", label: "Contractor Estimating App" },
        { href: "/how-to-send-an-estimate-from-phone", label: "How to Send Estimates From Phone" },
        { href: "/estimate-template-for-contractors", label: "Estimate Template for Contractors" },
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
        { href: "/job-tracking-for-contractors", label: "Job Tracking" },
      ]}
    />
  );
}
