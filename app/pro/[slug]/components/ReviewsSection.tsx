import { SectionTitle } from "./SectionTitle";
import type { Review } from "../types";
import { BadgeCheck } from "lucide-react";

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 mt-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-[10px] ${i < count ? "text-amber-400" : "text-gray-200"}`}>★</span>
      ))}
    </div>
  );
}

type Props = {
  reviews: Review[];
};

export function ReviewsSection({ reviews }: Props) {
  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 text-center">
        <div className="text-2xl mb-2">📅</div>
        <div className="font-bold text-slate-800 text-sm mb-1 uppercase tracking-tight">
          Now booking new customers
        </div>
        <div className="text-xs text-gray-500 leading-relaxed">
          Ask for a fast quote today — no account needed
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
      <SectionTitle>Reviews</SectionTitle>

      <div className="flex flex-col gap-3">
        {reviews.map((review, i) => (
          <div
            key={i}
            className="bg-gray-50 rounded-xl p-4 border border-gray-100"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold text-sm text-slate-800 leading-tight">
                  {review.name}
                </div>
                <StarRow count={review.stars} />
                <div className="text-[10px] text-gray-500 mt-1">
                  {review.jobType} · {review.location}
                </div>
              </div>
              {review.verified && (
                <span className="text-[9px] text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-tight flex items-center gap-1">
                  <BadgeCheck size={10} />
                  Verified
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 leading-relaxed italic">
              "{review.text}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
