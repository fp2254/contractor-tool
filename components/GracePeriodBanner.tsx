"use client";

interface GracePeriodBannerProps {
  daysLeft: number;
}

export function GracePeriodBanner({ daysLeft }: GracePeriodBannerProps) {
  const dayWord = daysLeft === 1 ? "day" : "days";

  return (
    <div className="w-full bg-amber-500 text-white px-4 py-2.5 text-center text-sm font-medium leading-snug">
      ⚠️ Your subscription payment is overdue — you have{" "}
      <strong>
        {daysLeft} {dayWord}
      </strong>{" "}
      left before access is restricted.{" "}
      <a
        href="mailto:support@tradebase.app?subject=Renew+Subscription"
        className="underline font-semibold whitespace-nowrap">
        Renew now
      </a>
    </div>
  );
}
