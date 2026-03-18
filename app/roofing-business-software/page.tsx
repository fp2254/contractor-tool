import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Roofing Business Software – Estimates, Jobs & Invoices | TradeBase",
  description: "TradeBase is roofing business software for managing estimates, crew scheduling, materials, and invoices from a mobile app built for the trade.",
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Roofing Business Software Built for the Crew, Not the Desk"
      subtitle="TradeBase helps roofing contractors quote jobs on site, track crews, log material costs, and close out jobs with professional invoices — all from a phone."
      problemHeadline="Running a roofing company means juggling a lot of moving parts."
      problems={[
        "Estimates that take too long to put together after the site visit",
        "Material and dump costs that never get tied back to the job",
        "Customers who want updates but keep calling at the wrong time",
        "Invoices that go out a week after the roof is done",
        "Crews on multiple jobs with no clear status tracking",
      ]}
      solutionHeadline="Quote it, run it, invoice it — from the driveway."
      solutionText="With TradeBase, you can quote a roof replacement on site, send it for signature through the customer portal, schedule the crew, log your shingle and underlayment receipts, and send the invoice the day the job is done. No office. No laptop required."
      features={[
        { icon: "📋", name: "Quotes", desc: "Build detailed roofing estimates with materials, labor, and scope." },
        { icon: "🔨", name: "Jobs", desc: "Schedule crews and track multiple jobs at once." },
        { icon: "💵", name: "Invoices", desc: "Invoice on completion. Track deposits and final payments." },
        { icon: "🧾", name: "Receipts", desc: "Scan shingle, underlayment, and dump truck receipts from the site." },
        { icon: "📦", name: "Inventory", desc: "Track materials across jobs so you don't over-order or run short." },
        { icon: "🤖", name: "AI Scope Generator", desc: "Add line items and let AI write a professional scope of work for the quote." },
        { icon: "📤", name: "Customer Portal", desc: "Customer gets a link to review and sign the estimate. No printer needed." },
        { icon: "👤", name: "Customers", desc: "Every job, quote, and payment per customer — in one place." },
        { icon: "🤝", name: "Trade Contacts", desc: "Subs, suppliers, dumpster companies — all organized and callable." },
      ]}
    />
  );
}
