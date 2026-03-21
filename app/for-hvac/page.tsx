import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "App for HVAC Contractors | Quotes & Invoices | TradeBase",
  description: "HVAC business software built for the field. Quote jobs, invoice on-site, and track every customer and service call from your phone.",
  openGraph: {
    title: "App for HVAC Contractors | TradeBase",
    description: "HVAC contractor app. Send quotes and invoices from your phone, track jobs and customers easily.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="HVAC Contractor App — Run Service Calls From Your Phone"
      subtitle="Quote installs, invoice service calls, track equipment, and manage customers — all from a phone app built for HVAC contractors."
      problemHeadline="HVAC business paperwork shouldn't eat your evenings."
      problems={[
        "Writing up installs and service quotes by hand after a long day",
        "Losing track of which service calls got invoiced and which didn't",
        "No record of what equipment a customer has or when it was last serviced",
        "Invoices sitting in a stack instead of getting paid",
        "No visibility into which jobs are scheduled next week",
      ]}
      solutionHeadline="The HVAC business app that keeps up with you in the field."
      solutionText="TradeBase is used by HVAC contractors to handle everything from a service call quote to a full system install invoice. Save your common service rates and equipment line items once, build a quote at the job site, send it to the homeowner or property manager on the spot, and invoice immediately when the work is complete. Every customer has a clean record — equipment, history, invoices, and notes."
      features={[
        { icon: "🌡️", name: "Service Presets", desc: "Save AC tune-ups, filter changes, refrigerant, and other common items for fast quoting." },
        { icon: "🧾", name: "On-Site Invoicing", desc: "Invoice the moment the job is done — not two days later." },
        { icon: "💵", name: "Payment Tracking", desc: "See every payment, every outstanding balance, and every overdue invoice." },
        { icon: "👤", name: "Customer Records", desc: "Equipment notes, job history, and contact info all in one place." },
        { icon: "📅", name: "Job Scheduling", desc: "Track what's scheduled so dispatching is simple." },
        { icon: "📥", name: "Lead Tracking", desc: "Follow every inquiry from first contact to booked service call." },
        { icon: "📤", name: "Customer Portal", desc: "Customers can approve quotes online — no fax, no scan." },
        { icon: "📱", name: "Works on Any Phone", desc: "iOS and Android. No app store download needed." },
      ]}
      ctaText="Run My HVAC Business"
      mistakes={[
        "Quoting verbally over the phone — homeowners forget what you said and resist the final number",
        "Not noting what equipment brand and model is installed — wastes time on return calls",
        "Invoicing weekly in batches — same-day invoicing gets paid 2x faster",
        "No follow-up system for seasonal maintenance reminders — lost recurring revenue",
      ]}
      internalLinks={[
        { href: "/invoice-app-for-hvac", label: "Invoice App for HVAC" },
        { href: "/hvac-business-software", label: "HVAC Business Software" },
        { href: "/contractor-estimating-app", label: "Contractor Estimating App" },
        { href: "/job-tracking-for-contractors", label: "Job Tracking" },
        { href: "/how-contractors-send-invoices-fast", label: "How to Send Invoices Fast" },
      ]}
    />
  );
}
