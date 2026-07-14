"use client";

import { ReviewForm as BaseReviewForm } from "../components/ReviewForm";

type Props = {
  slug: string;
  contractorName: string;
};

export function ReviewForm({ slug, contractorName }: Props) {
  return (
    <div className="min-h-screen p-4 pb-16" style={{ background: "#f4f5f7" }}>
      <div className="max-w-lg mx-auto">
        <div className="mb-6 text-center pt-4">
          <p className="text-sm text-gray-500 mb-1">Reviewing</p>
          <h1 className="text-xl font-bold text-slate-800">{contractorName}</h1>
        </div>
        <BaseReviewForm slug={slug} defaultOpen />
      </div>
    </div>
  );
}
