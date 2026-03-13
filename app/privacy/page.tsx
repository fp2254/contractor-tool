import Link from "next/link";

export const metadata = { title: "Privacy Policy – TradeBase" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/auth/login" className="text-[#1B3A6B] text-sm font-semibold">← Back to Login</Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Privacy Policy</h1>
            <p className="text-sm text-gray-400 mt-1">Last updated: March 2025</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">1. Information We Collect</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We collect information you provide directly to us when you create an account, including your name, email address, business name, and contact information. We also collect information about how you use TradeBase, such as jobs created, invoices sent, and customer records stored.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">2. How We Use Your Information</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We use the information we collect to provide, maintain, and improve our services; to process transactions; to send you technical notices and support messages; and to respond to your comments and questions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">3. Information Sharing</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share your information with service providers who assist us in operating our platform, conducting our business, or servicing you, so long as those parties agree to keep this information confidential.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">4. Data Security</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. All data is encrypted in transit using TLS and at rest.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">5. Customer Data</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Customer records, job details, invoices, and other business data you enter into TradeBase belong to you. We do not access this data except as necessary to provide the service or as required by law. You may export or delete your data at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">6. Cookies</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We use session cookies to keep you logged in. We do not use tracking or advertising cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">7. Changes to This Policy</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page with an updated date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">8. Contact Us</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at support@tradebase.app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
