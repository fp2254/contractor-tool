import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Estimate Template for Contractors | TradeBase",
  description: "Better than a Word template — a real contractor estimate builder for your phone. Build professional estimates in under 2 minutes from any job site.",
  openGraph: {
    title: "Estimate Template for Contractors | TradeBase",
    description: "Build professional contractor estimates on your phone. Faster and better than any Word template.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Contractor Estimate Template — or Skip the Template and Use a Real App"
      subtitle="Word templates are a starting point. But a contractor estimate app lets you build and send from the job site in under 2 minutes — on your phone, every time."
      problemHeadline="The problem with standard estimate templates."
      problems={[
        "Templates don't save your customers — you retype the address every time",
        "Opening Word or Google Docs on a phone is slow and awkward on-site",
        "No tracking of which estimates were approved, declined, or ignored",
        "Templates don't follow up on open estimates automatically",
        "Converting an approved estimate to an invoice means copying everything again",
      ]}
      solutionHeadline="A smarter option: an estimate app built for contractors."
      solutionText="TradeBase is free to try and gives you an estimate builder that runs entirely on your phone. Your services are saved. Your customers are saved. Building an estimate is fast because you're selecting, not typing. The estimate goes out by email, the customer approves online, and when the job is done, you convert it to an invoice in one tap. No template management. No copy-pasting."
      features={[
        { icon: "📋", name: "Estimate Builder", desc: "Build professional line-item estimates on any phone in under 2 minutes." },
        { icon: "💾", name: "Saved Services", desc: "Your rates and services saved once — use them on every estimate." },
        { icon: "💾", name: "Saved Customers", desc: "Customer info entered once. Never retype a name or address." },
        { icon: "✅", name: "Online Approval", desc: "Customer approves from their phone — no scanning, printing, or fax." },
        { icon: "📊", name: "Estimate Tracking", desc: "See every open, approved, and declined estimate in one list." },
        { icon: "🧾", name: "Estimate-to-Invoice", desc: "One tap converts an approved estimate to a ready-to-send invoice." },
        { icon: "🔔", name: "Follow-up Reminders", desc: "Get reminded when open estimates need a follow-up." },
        { icon: "📱", name: "Phone-First", desc: "Built for phones. Faster than any desktop template." },
      ]}
      ctaText="Try It Free — No Template Needed"
      mistakes={[
        "Using the same template for every trade — specific line items close faster than generic ones",
        "Sending estimates with no expiry date — customers come back months later expecting the same price",
        "Not itemizing labor and materials separately — customers want to know where the money goes",
        "Sending as an attachment vs. a link — links get opened, attachments get ignored",
      ]}
      internalLinks={[
        { href: "/contractor-estimating-app", label: "Contractor Estimating App" },
        { href: "/how-to-send-an-estimate-from-phone", label: "Send Estimates From Your Phone" },
        { href: "/contractor-quote-app", label: "Contractor Quote App" },
        { href: "/free-contractor-invoice-template", label: "Free Invoice Template" },
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
      ]}
    />
  );
}
