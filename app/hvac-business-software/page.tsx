import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "HVAC Business Software – Quotes, Maintenance & Invoices | TradeBase",
  description: "TradeBase is HVAC business software for managing service calls, installs, maintenance agreements, quotes, and invoices from a mobile-first app.",
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="HVAC Business Software for Service and Install Teams"
      subtitle="TradeBase helps HVAC contractors run service calls, manage installs, quote new equipment, and invoice customers — all from their phone, without going back to the office."
      problemHeadline="HVAC businesses are busy all season. Admin work shouldn't slow them down."
      problems={[
        "Service call notes written on paper and lost",
        "Equipment and parts costs not tracked per job",
        "Quoting new systems takes too long to be worth it",
        "Customers calling for updates on install timelines",
        "Invoices going out days after the job is complete",
      ]}
      solutionHeadline="Handle everything from service calls to full installs."
      solutionText="TradeBase is fast enough for a service tech to use between calls. Log the issue, quote the repair or replacement, document the work, scan the parts receipt, and send the invoice before you leave the driveway. For installs, track the full job timeline and send a portal link so the customer can sign the quote and review the invoice without calling."
      features={[
        { icon: "📋", name: "Quotes", desc: "Quote system replacements, repairs, and tune-ups on your phone." },
        { icon: "🔨", name: "Jobs", desc: "Track service calls and installs separately with job status boards." },
        { icon: "💵", name: "Invoices", desc: "Send invoices at the end of every service call. Get paid faster." },
        { icon: "🧾", name: "Receipts", desc: "Scan parts and refrigerant receipts from your phone." },
        { icon: "📦", name: "Inventory", desc: "Track filters, capacitors, and common parts across your stock." },
        { icon: "🤖", name: "AI Tools", desc: "Describe the service call out loud — TradeBase writes it up." },
        { icon: "📤", name: "Customer Portal", desc: "Customers approve equipment quotes without phone tag." },
        { icon: "👤", name: "Customers", desc: "Full service history per address so you know the system before you arrive." },
        { icon: "🤝", name: "Trade Contacts", desc: "Your suppliers, warranty reps, and subs organized and reachable." },
      ]}
    />
  );
}
