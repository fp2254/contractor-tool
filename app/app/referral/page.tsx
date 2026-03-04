const REFERRAL_HISTORY = [
  { name: "Mike P.", status: "Rewarded", when: "15 days ago" },
  { name: "Louie T.", status: "Rewarded", when: "32 days ago" },
  { name: "Steve R.", status: "Pending", when: "45 days ago" },
  { name: "Ed L.", status: "Rewarded", when: "60 days ago" },
];

export default function ReferralPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Referral Program</h1>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-2">Refer &amp; Earn</h2>
        <p className="text-sm text-gray-600 mb-4">
          Refer a fellow contractor to TradeBase. When they sign up, you both earn a $100 <span className="italic font-semibold">VISA</span> gift card.
        </p>
        <div className="flex gap-3">
          <div className="w-24 h-16 bg-blue-900 rounded-xl flex items-center justify-center text-white font-bold text-xs">
            💳 VISA
          </div>
          <div className="flex-1 space-y-2">
            <button className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-white font-semibold text-sm"
              style={{ backgroundColor: "#1B3A6B" }}>
              🔗 Share Link
            </button>
            <button className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-white font-semibold text-sm"
              style={{ backgroundColor: "#1B3A6B" }}>
              ✉️ Send Invite
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
        <p className="text-sm text-gray-500">4 Successful Referrals</p>
        <p className="text-4xl font-bold text-slate-800 mt-1">$ 400</p>
        <p className="text-sm text-gray-400">Earned</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Referral History</p>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {REFERRAL_HISTORY.map((ref) => (
            <div key={ref.name} className="flex items-center gap-3 px-4 py-3">
              <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ backgroundColor: "#1B3A6B" }}>
                {ref.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-sm">{ref.name}</p>
                <p className="text-xs text-gray-400">{ref.status}</p>
                <p className="text-xs text-gray-400">📞 referred: {ref.when}</p>
              </div>
              <div className="flex gap-2 text-gray-400 text-sm">
                <span>📞</span><span>💬</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
