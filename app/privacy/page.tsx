import Link from "next/link";

export const metadata = { title: "Privacy Policy – TradeBase" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="mb-8">
          <Link href="/" className="text-[#1B3A6B] text-sm font-semibold">← Back to Home</Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Privacy Policy</h1>
            <p className="text-sm text-gray-500 mt-1">TradeBase Contractors — a DBA of Liberty Grove Homestead Company, LLC</p>
            <p className="text-sm text-gray-400 mt-0.5">Last Updated: [Insert Date]</p>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            This Privacy Policy is part of our full{" "}
            <Link href="/terms" className="font-semibold underline" style={{ color: "#1B3A6B" }}>
              Terms of Service, Privacy Policy &amp; Acceptable Use Agreement
            </Link>
            . The sections below summarize how we collect and handle your data.
          </p>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">Data We Collect</h2>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase collects information to operate the Service, including:</p>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc pl-5 space-y-1">
              <li>Account details (name, email, business name)</li>
              <li>Contact and customer information you enter</li>
              <li>Uploaded business records (jobs, invoices, receipts, photos)</li>
              <li>Usage analytics and feature interactions</li>
              <li>Device and log data</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">How We Use Your Data</h2>
            <p className="text-sm text-gray-600 leading-relaxed">Your data is used to:</p>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc pl-5 space-y-1">
              <li>Operate and improve the platform</li>
              <li>Provide customer support</li>
              <li>Generate analytics and reports within your account</li>
              <li>Improve AI systems and features</li>
            </ul>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase may analyze aggregated and anonymized platform data to produce industry insights, pricing benchmarks, and market trends. Such data will never identify individual users or businesses.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">Data Sharing</h2>
            <p className="text-sm text-gray-600 leading-relaxed">We may share data with trusted service providers for hosting, analytics, and platform operations. <strong>We do not sell personally identifiable customer data.</strong></p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">Your Content</h2>
            <p className="text-sm text-gray-600 leading-relaxed">You retain ownership of all data you enter into TradeBase. We hold a non-exclusive license to store and process it solely to provide the Service. You are responsible for ensuring you have the legal right to upload any data you submit.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">AI Features</h2>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase includes AI features that generate job descriptions, scopes of work, summaries, and recommendations. AI outputs may contain inaccuracies. You are fully responsible for reviewing and verifying any AI-generated content before using it in your business.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">Contact</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Liberty Grove Homestead Company, LLC<br />
              DBA TradeBase Contractors<br />
              [Insert Business Address]<br />
              [Insert Contact Email]
            </p>
          </section>

          <div className="pt-2 border-t border-gray-100">
            <Link href="/terms" className="text-sm font-semibold underline" style={{ color: "#1B3A6B" }}>
              View full Terms of Service, Privacy Policy &amp; Acceptable Use Agreement →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
