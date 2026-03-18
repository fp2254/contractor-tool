import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

export const metadata: Metadata = {
  title: "Features – TradeBase Contractor Software",
  description:
    "Leads, quotes, jobs, invoices, receipts, inventory, AI tools, and a customer portal — everything a contractor needs to run their business from their phone.",
};

const FEATURE_GROUPS = [
  {
    title: "Leads & Sales",
    icon: "📥",
    features: [
      { name: "Lead Inbox", desc: "Log every call, referral, and website inquiry. See what stage each lead is at." },
      { name: "Lead Status Tracking", desc: "Move leads from New → Contacted → Quoted → Won. Nothing slips through." },
      { name: "Convert to Customer", desc: "One tap to turn a won lead into a customer record, ready for quoting and job creation." },
    ],
  },
  {
    title: "Customers",
    icon: "👤",
    features: [
      { name: "Customer Profiles", desc: "Name, phone, email, address, and all job and billing history in one place." },
      { name: "Job History", desc: "See every quote, job, and invoice tied to a customer without digging through records." },
      { name: "Notes & Activity", desc: "Log calls, site visits, and reminders directly on the customer record." },
      { name: "Customer Portal Access", desc: "Customers receive a branded link to view their quotes and invoices without needing an account." },
    ],
  },
  {
    title: "Quotes",
    icon: "📋",
    features: [
      { name: "Mobile Quote Builder", desc: "Build a professional quote on your phone in minutes — line items, totals, scope, warranty." },
      { name: "Service Presets", desc: "Save your most common services with prices. Add them to a quote in one tap." },
      { name: "Scope of Work", desc: "Write a full scope of work manually or use AI to generate it from your line items." },
      { name: "Terms & Warranty Clauses", desc: "Add your standard warranty terms to every quote. Customers see exactly what they're agreeing to." },
      { name: "AI Follow-up Drafter", desc: "No response after a week? Let AI draft a professional follow-up message in seconds." },
      { name: "Quote Signing", desc: "Customers can review and sign quotes directly from their portal link." },
    ],
  },
  {
    title: "Jobs",
    icon: "🔨",
    features: [
      { name: "Job Scheduling", desc: "Set start dates, assign status, and track job progress from your phone." },
      { name: "Job Status Board", desc: "See all active jobs at a glance — Scheduled, In Progress, Complete, On Hold." },
      { name: "Attach Photos & Notes", desc: "Document the job site with photos and internal notes. Keep a record of everything." },
      { name: "Convert Quote to Job", desc: "When a quote is approved, create a job from it with one tap — no re-entry." },
      { name: "Daily Ops Board", desc: "Every morning, see your scheduled jobs, overdue tasks, and anything that needs attention." },
    ],
  },
  {
    title: "Invoices",
    icon: "💵",
    features: [
      { name: "Send Invoices Instantly", desc: "Create and send an invoice the moment the job is done, right from your phone." },
      { name: "Payment Tracking", desc: "Mark invoices paid, track partial payments, and see exactly what's outstanding." },
      { name: "Overdue Alerts", desc: "Get flagged when an invoice is past due so you can follow up without losing track." },
      { name: "Convert Job to Invoice", desc: "Turn a completed job into an invoice in one tap. Line items carry over automatically." },
    ],
  },
  {
    title: "Receipts & Expenses",
    icon: "🧾",
    features: [
      { name: "AI Receipt Scanner", desc: "Point your camera at any receipt. TradeBase reads the amount, vendor, and date automatically." },
      { name: "Expense Logging", desc: "Log job expenses on site and tie them to the right job or customer." },
      { name: "Receipt Archive", desc: "All your receipts stored and searchable. No more digging through paper at tax time." },
    ],
  },
  {
    title: "Inventory",
    icon: "📦",
    features: [
      { name: "Parts & Materials Tracking", desc: "Track what you have in stock so you're never surprised at the supply house." },
      { name: "Quantity Adjustments", desc: "Tap + or − to update stock levels as you use materials on a job." },
      { name: "Categories & SKUs", desc: "Organize inventory by category. Add SKUs to match your supplier's system." },
      { name: "Low Stock Awareness", desc: "See at a glance which items have hit zero so you can reorder before the next job." },
    ],
  },
  {
    title: "Trade Contacts",
    icon: "🤝",
    features: [
      { name: "Sub & Vendor Directory", desc: "Keep your network of electricians, plumbers, framers, and suppliers organized." },
      { name: "Business Card Scanner", desc: "Scan a card on the jobsite. TradeBase reads the info and creates the contact automatically." },
      { name: "Refer Work", desc: "When a customer needs something outside your trade, find the right sub instantly." },
      { name: "Contact Notes", desc: "Log notes about a sub's specialty, rates, reliability, or anything else worth remembering." },
    ],
  },
  {
    title: "Customer Portal",
    icon: "📤",
    features: [
      { name: "Branded Links", desc: "Every quote and invoice gets a unique customer portal link with your business name on it." },
      { name: "Quote Review & Signing", desc: "Customers open the link, review the full quote, and sign from their phone — no app needed." },
      { name: "Invoice Viewing", desc: "Customers can view their invoice, see line items, and confirm payment details." },
      { name: "PDF Downloads", desc: "Customers can download a PDF copy of any quote or invoice from their portal." },
      { name: "No Account Required", desc: "Customers don't need to create an account. They just tap the link and they're in." },
    ],
  },
  {
    title: "AI Features",
    icon: "🤖",
    features: [
      { name: "AI Job Capture", desc: "Describe a job in plain English — by typing or speaking — and TradeBase fills in the customer, scope, and line items." },
      { name: "Scope of Work Generator", desc: "Add your line items and let AI draft a complete professional scope of work for your quote." },
      { name: "Follow-up Drafter", desc: "AI writes a professional follow-up message for any unanswered quote. You review before sending." },
      { name: "Receipt Scanner", desc: "AI reads receipt photos and extracts the vendor, amount, date, and category automatically." },
      { name: "Business Card Scanner", desc: "AI reads contact info from a business card photo and fills in the contact form." },
      { name: "Permit Assistant", desc: "Ask questions about local permits, inspections, or code in plain language and get practical answers." },
      { name: "Client Intel", desc: "Before a call, get an AI summary of a customer's history, open jobs, and unpaid invoices." },
      { name: "Daily Ops Summary", desc: "Every morning, AI summarizes what's on your plate — jobs due, overdue invoices, leads to follow up." },
    ],
  },
  {
    title: "Reports & Export",
    icon: "📊",
    features: [
      { name: "Revenue Summary", desc: "See total invoiced, collected, and outstanding at a glance." },
      { name: "Job Performance", desc: "Track how many jobs you've completed and what your average job value looks like." },
      { name: "Export Records", desc: "Export customer, job, and invoice data for your accountant or tax preparer." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MarketingNav />

      <div className="bg-[#1B3A6B] text-white py-12 text-center">
        <div className="max-w-2xl mx-auto px-5">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Everything a contractor needs.</h1>
          <p className="text-blue-100 text-lg">Built for the field. No bloat. No fluff.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-12 space-y-12">
        {FEATURE_GROUPS.map((group) => (
          <section key={group.title}>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">{group.icon}</span>
              <h2 className="text-xl font-bold text-slate-800">{group.title}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.features.map((f) => (
                <div key={f.name} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-slate-800 text-sm mb-1">{f.name}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="bg-[#1B3A6B] text-white py-12 text-center">
        <div className="max-w-xl mx-auto px-5">
          <h2 className="text-2xl font-bold mb-3">Ready to run your business from your phone?</h2>
          <p className="text-blue-100 mb-6">Join the waitlist and lock in founder pricing before we launch.</p>
          <Link href="/waitlist"
            className="inline-block rounded-xl px-8 py-3.5 bg-white font-bold text-[#1B3A6B] hover:bg-blue-50 transition-colors">
            Join the Waitlist
          </Link>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
