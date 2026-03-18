import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Contractor Software – Run Your Business from Your Phone | TradeBase",
  description: "TradeBase is contractor software built for the field. Manage quotes, jobs, invoices, receipts, inventory, and customers from one mobile-first app.",
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Contractor Software Built for the Field"
      subtitle="Stop juggling spreadsheets, texts, and paper. TradeBase gives contractors a single app to run quotes, jobs, invoices, receipts, inventory, and customer records — all from their phone."
      problemHeadline="Most contractor businesses are managed through chaos."
      problems={[
        "Quoting jobs on paper or in random spreadsheets",
        "Invoices that go out late — or not at all",
        "Customer info split across phone contacts, texts, and notes",
        "Jobs tracked through memory and text threads",
        "Receipts lost before tax season",
      ]}
      solutionHeadline="One app. Everything a contractor needs."
      solutionText="TradeBase replaces the pile of apps, sticky notes, and spreadsheets contractors use to run their business. It's fast, mobile-first, and designed specifically for the way contractors actually work — in driveways, basements, trucks, and jobsites."
      features={[
        { icon: "📋", name: "Quotes", desc: "Build and send professional quotes in minutes on your phone." },
        { icon: "🔨", name: "Jobs", desc: "Schedule and track every active job from start to finish." },
        { icon: "💵", name: "Invoices", desc: "Send invoices the moment the job is done. Track what's paid." },
        { icon: "👤", name: "Customers", desc: "Full customer history — jobs, quotes, invoices, and notes." },
        { icon: "📥", name: "Leads", desc: "Log every inquiry so nothing gets forgotten." },
        { icon: "🧾", name: "Receipts", desc: "Scan and store job receipts from your phone camera." },
        { icon: "📦", name: "Inventory", desc: "Track materials and parts without a spreadsheet." },
        { icon: "🤖", name: "AI Tools", desc: "Capture jobs by voice, generate scope, draft follow-ups." },
        { icon: "📤", name: "Customer Portal", desc: "Customers review and sign quotes without needing an account." },
      ]}
    />
  );
}
