import Link from "next/link";

export const metadata = { title: "Terms of Service – TradeBase" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="mb-8">
          <Link href="/auth/login" className="text-[#1B3A6B] text-sm font-semibold">← Back to Login</Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">TradeBase Terms of Service, Privacy Policy &amp; Acceptable Use Agreement</h1>
            <p className="text-sm text-gray-400 mt-1">Last Updated: [Insert Date]</p>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">1. Introduction</h2>
            <p className="text-sm text-gray-600 leading-relaxed">These Terms of Service ("Terms") govern your access to and use of the TradeBase platform, website, and applications (collectively, the "Service").</p>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase Contractors is a "doing business as" (DBA) of Liberty Grove Homestead Company, LLC ("Company," "we," "our," or "us").</p>
            <p className="text-sm text-gray-600 leading-relaxed">By accessing or using TradeBase, you agree to these Terms. If you do not agree, you may not use the Service.</p>
            <p className="text-sm text-gray-600 leading-relaxed">The Service is intended for business use by contractors, tradespeople, and service providers.</p>
            <p className="text-sm text-gray-600 leading-relaxed">You must be at least 18 years old to use the Service.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">2. Description of Service</h2>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase is a software platform designed to assist contractors with:</p>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc pl-5 space-y-1">
              <li>Lead tracking</li>
              <li>Customer management</li>
              <li>Quotes and invoicing</li>
              <li>Job scheduling</li>
              <li>Inventory tracking</li>
              <li>Expense and receipt management</li>
              <li>AI-generated assistance</li>
              <li>Trade contact management</li>
              <li>Data analysis and reporting</li>
            </ul>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase may modify or discontinue features at any time without prior notice.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">3. User Accounts</h2>
            <p className="text-sm text-gray-600 leading-relaxed">Users must provide accurate account information. You are responsible for:</p>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc pl-5 space-y-1">
              <li>maintaining the security of your account</li>
              <li>safeguarding login credentials</li>
              <li>activity conducted through your account</li>
            </ul>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase is not liable for unauthorized access resulting from compromised credentials. We reserve the right to suspend or terminate accounts that violate these Terms.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">4. Acceptable Use Policy</h2>
            <p className="text-sm text-gray-600 leading-relaxed">Users may not use the Service to:</p>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc pl-5 space-y-1">
              <li>violate any laws or regulations</li>
              <li>harass, threaten, or defraud others</li>
              <li>distribute spam or unsolicited communications</li>
              <li>upload malicious code or attempt to hack the system</li>
              <li>scrape or harvest other users' data</li>
              <li>impersonate individuals or businesses</li>
              <li>conduct illegal services or transactions</li>
            </ul>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase reserves the right to remove content and terminate accounts that violate these rules.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">5. User Content</h2>
            <p className="text-sm text-gray-600 leading-relaxed">Users may upload data including job details, contact information, invoices and quotes, receipts and expenses, and photos and documents.</p>
            <p className="text-sm text-gray-600 leading-relaxed">You retain ownership of your content. However, by using the Service you grant TradeBase a non-exclusive license to store, process, and analyze your content solely for operating and improving the Service.</p>
            <p className="text-sm text-gray-600 leading-relaxed">Users are responsible for ensuring they have the legal right to upload any data they submit.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">6. Data Collection and Privacy</h2>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase collects certain information to operate the Service, including account details, contact and customer information, uploaded business records, usage analytics, and device and log data.</p>
            <p className="text-sm text-gray-600 leading-relaxed">This data is used to operate and improve the platform, provide support, generate analytics and reports, and improve AI systems and features.</p>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase may analyze aggregated and anonymized platform data to produce industry insights, pricing benchmarks, market trends, and research reports. Such aggregated data will not identify individual users or businesses.</p>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase may share data with trusted service providers for hosting, analytics, and platform operations. We do not sell personally identifiable customer data.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">7. AI Feature Disclaimer</h2>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase includes artificial intelligence features that may generate job descriptions, scopes of work, summaries, and suggestions or recommendations.</p>
            <p className="text-sm text-gray-600 leading-relaxed">AI outputs may contain inaccuracies. Users remain fully responsible for reviewing, verifying, and approving any AI-generated content before using it in their business. TradeBase is not responsible for decisions made based on AI-generated outputs.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">8. Third-Party Services</h2>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase may integrate with third-party services such as payment processors, email providers, cloud hosting providers, and analytics services. TradeBase is not responsible for the policies, services, or actions of third-party providers. Users agree to comply with the terms of those third parties when using integrated services.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">9. Referrals and Trade Contacts</h2>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase may allow users to store and share trade contacts or refer work to other contractors. TradeBase does not guarantee licensing status, work quality, business practices, or service outcomes.</p>
            <p className="text-sm text-gray-600 leading-relaxed">All agreements and business relationships formed between users or contractors are solely between those parties. TradeBase is not responsible for disputes, payments, or work performed.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">10. Limitation of Liability</h2>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase is provided on an "AS IS" and "AS AVAILABLE" basis. To the maximum extent permitted by law, TradeBase and Liberty Grove Homestead Company, LLC shall not be liable for: lost profits, lost business opportunities, missed jobs, inaccurate data, service interruptions, system outages, data loss, contractor disputes, or third-party services.</p>
            <p className="text-sm text-gray-600 leading-relaxed">Under no circumstances shall the Company's total liability exceed the amount paid by the user for the Service in the previous 12 months.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">11. No Warranties</h2>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase makes no warranties regarding uninterrupted service, error-free operation, accuracy of information, or suitability for any specific business purpose. Users assume all risks associated with using the Service.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">12. Indemnification</h2>
            <p className="text-sm text-gray-600 leading-relaxed">Users agree to indemnify and hold harmless Liberty Grove Homestead Company, LLC from any claims, damages, or legal actions resulting from misuse of the Service, violation of these Terms, disputes between contractors and customers, or illegal or fraudulent activity conducted through the platform.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">13. Termination</h2>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase may suspend or terminate accounts at any time for violations of these Terms. Users may discontinue use of the Service at any time. Termination does not remove obligations that occurred prior to termination.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">14. Governing Law</h2>
            <p className="text-sm text-gray-600 leading-relaxed">These Terms shall be governed by the laws of the State of Maine, United States.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">15. Arbitration Agreement</h2>
            <p className="text-sm text-gray-600 leading-relaxed">All disputes arising from these Terms or the use of TradeBase shall be resolved through binding arbitration rather than court litigation. Users waive the right to participate in class-action lawsuits. Arbitration shall take place in the State of Maine unless otherwise agreed by both parties.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">16. Modifications to Terms</h2>
            <p className="text-sm text-gray-600 leading-relaxed">TradeBase reserves the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the revised Terms.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-700">17. Contact Information</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Liberty Grove Homestead Company, LLC<br />
              DBA TradeBase Contractors<br />
              [Insert Business Address]<br />
              [Insert Contact Email]
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
