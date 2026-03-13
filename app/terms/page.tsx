import Link from "next/link";

export const metadata = { title: "Terms of Service – TradeBase" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/auth/login" className="text-[#1B3A6B] text-sm font-semibold">← Back to Login</Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Terms of Service</h1>
            <p className="text-sm text-gray-400 mt-1">Last updated: March 2025</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">1. Acceptance of Terms</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              By accessing or using TradeBase, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">2. Description of Service</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              TradeBase is a business management platform designed for tradespeople and contractors. The service includes tools for managing leads, customers, quotes, jobs, invoices, payments, and related business operations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">3. Account Responsibilities</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">4. Acceptable Use</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              You agree to use TradeBase only for lawful purposes and in a manner that does not infringe the rights of others. You may not use the service to store or transmit illegal content, engage in fraudulent activities, or violate any applicable laws or regulations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">5. Your Data</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              You retain ownership of all data you enter into TradeBase. You grant us a limited license to store and process this data solely for the purpose of providing the service to you. You are responsible for ensuring the accuracy of data you enter and for compliance with any applicable data protection laws.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">6. Service Availability</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We strive to maintain high availability but do not guarantee uninterrupted access to the service. We reserve the right to modify, suspend, or discontinue the service at any time with reasonable notice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">7. Limitation of Liability</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              TradeBase is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service, including but not limited to loss of data or business interruption.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">8. Termination</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Either party may terminate this agreement at any time. Upon termination, your right to use the service will immediately cease. You may export your data at any time before termination.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">9. Changes to Terms</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We reserve the right to modify these Terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-700">10. Contact</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              For questions about these Terms of Service, contact us at support@tradebase.app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
