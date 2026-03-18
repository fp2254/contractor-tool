import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Electrician Business Software – Quotes, Jobs & Invoices | TradeBase",
  description: "TradeBase is electrician business software for managing quotes, jobs, permits, invoices, and customers from a mobile-first app designed for the trade.",
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Electrician Business Software Built for the Trade"
      subtitle="TradeBase helps electricians quote jobs faster, track work orders, handle permits, and send invoices — all from their phone, without a desk or office."
      problemHeadline="Most electricians are running their business the hard way."
      problems={[
        "Quoting panel upgrades or service calls with no consistent format",
        "Work orders tracked through texts or memory",
        "Customers asking about permit status mid-job",
        "Material receipts lost before the job is closed out",
        "Invoices going out late because there's no time after hours",
      ]}
      solutionHeadline="From rough-in to punch list — one app for the whole job."
      solutionText="TradeBase gives electricians a fast, mobile system to quote the job, track materials, document the work, and close it out with a professional invoice — without spending evenings doing paperwork. The AI tools even help with permit questions and scope write-ups."
      features={[
        { icon: "📋", name: "Quotes", desc: "Quote panel upgrades, service calls, and new construction from your phone." },
        { icon: "🔨", name: "Jobs", desc: "Track rough-in, trim, and inspection status across every active job." },
        { icon: "💵", name: "Invoices", desc: "Invoice on site the moment the final inspection passes." },
        { icon: "🧾", name: "Receipts", desc: "Scan wire, breakers, fixtures, and supply receipts on the spot." },
        { icon: "📦", name: "Inventory", desc: "Know what's in the van before heading to the supply house." },
        { icon: "🤖", name: "Permit Assistant", desc: "Ask permit and inspection questions in plain language and get practical answers." },
        { icon: "📤", name: "Customer Portal", desc: "Customers sign your quote from their phone. No back and forth." },
        { icon: "👤", name: "Customers", desc: "Service history, open jobs, and all notes per customer in one place." },
        { icon: "🤝", name: "Trade Contacts", desc: "Your inspectors, subs, and suppliers — organized and easy to reach." },
      ]}
    />
  );
}
