import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Plumbing Business Software – Quotes, Jobs & Invoices | TradeBase",
  description: "TradeBase is plumbing business software that helps plumbers send quotes, track jobs, invoice customers, and manage their business from their phone.",
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Plumbing Business Software That Fits in Your Pocket"
      subtitle="From the service call to the final invoice, TradeBase helps plumbers run their business without paperwork, spreadsheets, or office hours."
      problemHeadline="Running a plumbing business is harder than the work itself."
      problems={[
        "Writing estimates by hand or in email threads",
        "Customers asking for status on jobs mid-day",
        "Invoices that go out days after the job is done",
        "Part costs and receipts lost in the truck",
        "Emergency calls with no record of what was done last time",
      ]}
      solutionHeadline="Quote, schedule, invoice — all from your phone."
      solutionText="TradeBase is built for plumbers who work alone or run a small crew. Create quotes on site, attach receipts from the supply house, schedule service calls, and send invoices the moment the drain is cleared or the fixture is set. Your customer gets a professional document and you get paid faster."
      features={[
        { icon: "📋", name: "Quotes", desc: "Build quotes on site — parts, labor, total — and text them a link." },
        { icon: "🔨", name: "Jobs", desc: "Track service calls and larger installs from one job board." },
        { icon: "💵", name: "Invoices", desc: "Invoice the moment the job is done. No waiting until the end of the week." },
        { icon: "🧾", name: "Receipts", desc: "Scan your supply house receipts on the spot. Never lose them again." },
        { icon: "👤", name: "Customers", desc: "Full history per customer — what was done, what's owed, all notes." },
        { icon: "📦", name: "Inventory", desc: "Track fittings, fixtures, and supplies so you always know what's on the truck." },
        { icon: "🤖", name: "AI Job Capture", desc: "Call comes in — describe it by voice and TradeBase logs the details." },
        { icon: "📤", name: "Customer Portal", desc: "Send a quote link. Customer reviews, approves, and signs from their phone." },
        { icon: "🤝", name: "Trade Contacts", desc: "Keep your subs, suppliers, and referral partners organized." },
      ]}
    />
  );
}
