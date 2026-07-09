import type { ContractorProfile } from "../types";
import { BadgeCheck } from "lucide-react";

type Props = {
  review: ContractorProfile["featuredReview"];
};

export function FeaturedReview({ review }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 relative">
      <div className="text-4xl text-[#EAF0FB] absolute top-4 right-6 font-serif select-none">
        &ldquo;
      </div>
      <p className="text-sm text-slate-700 leading-relaxed italic mb-4 relative z-10">
        {review.text}
      </p>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-slate-800 leading-tight">
            {review.reviewer}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {review.jobType} · {review.location}
          </div>
        </div>
        <span className="text-[9px] text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-tight flex items-center gap-1">
          <BadgeCheck size={10} />
          Verified
        </span>
      </div>
    </div>
  );
}
