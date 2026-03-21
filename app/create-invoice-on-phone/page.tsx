import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Create an Invoice on Your Phone | TradeBase",
  description: "Learn how to create a professional contractor invoice from your phone in under 2 minutes — no laptop, no templates, no hassle.",
  openGraph: {
    title: "Create a Contractor Invoice on Your Phone | TradeBase",
    description: "Send professional invoices from any job site using your phone. Built for contractors.",
    type: "website",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      h1="Create a Professional Invoice on Your Phone — In Under 2 Minutes"
      subtitle="You finished the job. Don't wait three days to get paid. Build and send the invoice right from your phone before you back out of the driveway."
      problemHeadline="Getting paid shouldn't require a laptop and an hour of your evening."
      problems={[
        "Waiting until you get home to write up the invoice — and then forgetting",
        "Customers saying they never got the invoice you texted or emailed manually",
        "Invoice templates in Word or Excel that take forever on a phone screen",
        "No clean way to record payment when it's collected on-site",
        "Outstanding balances piling up because no one followed up",
      ]}
      solutionHeadline="Your phone is already your office. Use it to get paid."
      solutionText="TradeBase is designed to be fast on a phone screen. You pick the customer, add line items from your saved service list, set the amount, and send — the whole thing takes about 90 seconds. The invoice goes to the customer's email with your business name on it. You get a record. They get a professional document. Everyone knows what was agreed on."
      features={[
        { icon: "📱", name: "Phone-Optimized", desc: "Every screen is designed for thumb navigation, not a mouse." },
        { icon: "📋", name: "Saved Services", desc: "Tap to add your most common services — no typing required every time." },
        { icon: "📤", name: "One-Tap Send", desc: "Invoice goes straight to the customer's email from the field." },
        { icon: "💵", name: "Collect Payment", desc: "Log payment on-site and close the invoice immediately." },
        { icon: "🧾", name: "Professional Format", desc: "Clean invoice with your business name — not a screenshot or a text." },
        { icon: "📊", name: "Payment Dashboard", desc: "See everything paid and outstanding on the dashboard the moment you log in." },
        { icon: "🔔", name: "Overdue Alerts", desc: "TradeBase flags overdue invoices so nothing gets forgotten." },
        { icon: "👤", name: "Customer Linked", desc: "Every invoice is stored under the customer automatically." },
      ]}
      ctaText="Create My First Invoice Free"
      mistakes={[
        "Texting the invoice total instead of sending a real invoice — no paper trail if there's a dispute",
        "Collecting cash without logging it anywhere — leads to 'I already paid you' problems",
        "Not adding a due date to the invoice — 'net 30' means different things to different people",
        "Sending one big invoice for multiple jobs at once — individual invoices get paid faster",
      ]}
      internalLinks={[
        { href: "/contractor-invoice-app", label: "Contractor Invoice App" },
        { href: "/field-invoice-app", label: "Field Invoice App" },
        { href: "/how-contractors-send-invoices-fast", label: "How Contractors Send Invoices Fast" },
        { href: "/free-contractor-invoice-template", label: "Free Contractor Invoice Template" },
        { href: "/invoice-app-for-handyman", label: "Invoice App for Handyman" },
      ]}
    />
  );
}
