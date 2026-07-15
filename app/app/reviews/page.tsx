import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { ReviewsClient } from "./ReviewsClient";

export default async function ReviewsPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [reviewsResult, profileResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from("profile_reviews")
      .select("id, reviewer_name, rating, text, job_type, location, verified, approved, created_at")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from("public_profiles")
      .select("slug, is_published")
      .eq("org_id", orgId!)
      .maybeSingle(),
  ]);

  const reviews = reviewsResult.data ?? [];
  const profile = profileResult.data;
  const pendingCount = reviews.filter((r: { approved: boolean }) => !r.approved).length;
  const avgRating = reviews.filter((r: { approved: boolean }) => r.approved).length > 0
    ? (reviews.filter((r: { approved: boolean }) => r.approved).reduce((s: number, r: { rating: number }) => s + r.rating, 0) /
       reviews.filter((r: { approved: boolean }) => r.approved).length).toFixed(1)
    : null;

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/app/more" className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">My Reviews</h1>
          <p className="text-xs text-gray-500 mt-0.5">Approve reviews to show them on your profile</p>
        </div>
        {pendingCount > 0 && (
          <span className="bg-amber-400 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Stats row */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
            <p className="text-xl font-bold text-slate-800">{reviews.length}</p>
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Total</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
            <p className="text-xl font-bold text-green-600">{reviews.filter((r: { approved: boolean }) => r.approved).length}</p>
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Live</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
            <p className="text-xl font-bold text-amber-500">{avgRating ?? "—"}</p>
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Avg ★</p>
          </div>
        </div>
      )}

      {/* Share review link */}
      {profile?.slug && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5">
          <p className="text-xs font-bold text-blue-700 mb-1">📤 Get more reviews</p>
          <p className="text-xs text-blue-600 mb-2">Share this link with customers after a job</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-blue-800 truncate">
              {typeof window !== "undefined" ? window.location.origin : ""}/showcase/{profile.slug}/review
            </code>
            <a
              href={`/showcase/${profile.slug}/review`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1.5 rounded-lg whitespace-nowrap"
            >
              Preview ↗
            </a>
          </div>
        </div>
      )}

      {!profile?.slug && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
          <p className="text-xs font-bold text-amber-700 mb-1">⚠️ Set up your public profile first</p>
          <p className="text-xs text-amber-600 mb-2">You need a published profile before collecting reviews.</p>
          <Link href="/app/profile/public-profile" className="text-xs font-bold text-amber-700 underline">
            Set up profile →
          </Link>
        </div>
      )}

      <ReviewsClient initialReviews={reviews} />
    </div>
  );
}
