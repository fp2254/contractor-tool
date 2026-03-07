"use client";

import { useState, useEffect } from "react";

type Referral = {
  id: string;
  referred_email: string | null;
  status: string;
  created_at: string;
};

type ReferralData = {
  code: string;
  totalReferred: number;
  activeReferrals: number;
  monthlyEarnings: number;
  lifetimeEarnings: number;
  referrals: Referral[];
};

const SUBSCRIPTION_PRICE = 30;
const REFERRAL_PCT = 20;
const PAYOUT_PER_REFERRAL = (SUBSCRIPTION_PRICE * REFERRAL_PCT) / 100;

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    inactive: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = {
    active: "Active",
    pending: "Pending",
    inactive: "Inactive",
  };
  const cls = styles[status] ?? styles.pending;
  return (
    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${cls}`}>
      {labels[status] ?? status}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export default function ReferralDashboard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [appUrl, setAppUrl] = useState("");

  useEffect(() => {
    setAppUrl(window.location.origin);
    fetch("/app/referral/api")
      .then((r) => r.json())
      .then((d) => setData(d as ReferralData))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const referralLink = data ? `${appUrl}/auth/sign-up?ref=${data.code}` : "";

  async function handleCopy() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleShare() {
    if (!referralLink) return;
    if (navigator.share) {
      await navigator.share({
        title: "Join me on TradeBase",
        text: `I've been using TradeBase to run my trade business — quotes, jobs, invoices all in one place. Sign up with my link and let's both earn:`,
        url: referralLink,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-20" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
        Could not load referral data. Make sure the database tables are set up.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Your Referral Link</p>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-700 break-all leading-relaxed">
            {referralLink || "Generating…"}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors"
            style={{ backgroundColor: copied ? "#16A34A" : "#1B3A6B", color: "white" }}>
            {copied ? "✓ Copied!" : "Copy Link"}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border border-gray-200 text-slate-700">
            Share
          </button>
        </div>
      </div>

      <div className="bg-[#1B3A6B] rounded-2xl p-4 text-white space-y-1">
        <p className="text-xs font-medium opacity-75">How it works</p>
        <p className="text-sm leading-relaxed opacity-90">
          You earn <span className="font-bold text-white">{REFERRAL_PCT}%</span> of each
          referred contractor&apos;s monthly subscription — that&apos;s{" "}
          <span className="font-bold text-white">${PAYOUT_PER_REFERRAL}/month</span> per
          active referral, for as long as they stay subscribed.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-[#1B3A6B]">{data.totalReferred}</p>
          <p className="text-xs text-gray-500 mt-1">Contractors Referred</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-green-600">{data.activeReferrals}</p>
          <p className="text-xs text-gray-500 mt-1">Active Referrals</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-[#1B3A6B]">
            ${data.monthlyEarnings.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">This Month</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-[#1B3A6B]">
            ${data.lifetimeEarnings.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Lifetime Earnings</p>
        </div>
      </div>

      {data.totalReferred === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm space-y-2">
          <p className="text-2xl">👷</p>
          <p className="text-sm font-semibold text-slate-700">No referrals yet</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Share your link with fellow contractors. Every signup through your link
            earns you ${PAYOUT_PER_REFERRAL}/month while they&apos;re subscribed.
          </p>
          <button
            onClick={handleShare}
            className="mt-2 w-full rounded-xl py-3 text-white font-semibold text-sm"
            style={{ backgroundColor: "#1B3A6B" }}>
            Share Your Link
          </button>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Referral History
          </p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
            {data.referrals.map((ref) => {
              const label = ref.referred_email ?? "Anonymous Signup";
              const initial = label.charAt(0).toUpperCase();
              return (
                <div key={ref.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: "#1B3A6B" }}>
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{label}</p>
                    <p className="text-xs text-gray-400">{timeAgo(ref.created_at)}</p>
                  </div>
                  <StatusBadge status={ref.status} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase">Payout Rules</p>
        <ul className="text-xs text-gray-500 space-y-1 leading-relaxed">
          <li>• Payouts begin after the referred contractor completes their first paid billing cycle</li>
          <li>• You earn ${PAYOUT_PER_REFERRAL}/month for each active subscriber you referred</li>
          <li>• Payouts stop if the referred account cancels their subscription</li>
          <li>• Earnings are lifetime — no cap, no expiry</li>
        </ul>
      </div>
    </div>
  );
}
