import { useState } from "react";
import { Star } from "lucide-react";

type Props = {
  slug: string;
};

export function ReviewForm({ slug }: Props) {
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [jobType, setJobType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stars || !name.trim() || !email.trim() || !comment.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/reviews/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewer_name: name.trim(),
          reviewer_email: email.trim(),
          stars,
          comment: comment.trim(),
          job_type: jobType.trim() || undefined,
        }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Submission failed");
      setDone(true);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
      {done ? (
        <div className="bg-green-50 rounded-xl p-6 text-center border border-green-100">
          <div className="text-3xl mb-3">✅</div>
          <h3 className="font-bold text-slate-800 mb-1">Thanks for your review!</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your review has been submitted and is awaiting approval before it appears publicly.
          </p>
        </div>
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
        >
          <Star size={18} className="text-amber-400 fill-amber-400" />
          <span className="font-bold text-slate-800 text-sm">Leave a Review</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-2">Write a Review</h3>

          {/* Star selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
              Your Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n)}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(0)}
                  className="focus:outline-none transition-transform active:scale-95"
                >
                  <Star
                    size={32}
                    className={`${n <= (hovered || stars) ? "text-amber-400 fill-amber-400" : "text-gray-200"}`}
                  />
                </button>
              ))}
            </div>
            {stars > 0 && (
              <p className="text-[10px] text-gray-400 mt-1 font-medium ml-1">
                {["", "Poor", "Fair", "Good", "Great", "Excellent"][stars]}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/5 focus:border-[#1B3A6B] transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                Email <span className="text-red-500">*</span>
                <span className="normal-case font-medium text-[10px] ml-1.5 opacity-60">(not public)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/5 focus:border-[#1B3A6B] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
              Type of Job <span className="normal-case font-medium text-[10px] ml-1.5 opacity-60">(optional)</span>
            </label>
            <input
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              placeholder="e.g. Bathroom remodel"
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/5 focus:border-[#1B3A6B] transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
              Your Review <span className="text-red-500">*</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe your experience..."
              required
              rows={4}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/5 focus:border-[#1B3A6B] transition-all resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setOpen(false); setError(""); }}
              className="flex-1 bg-gray-50 border border-gray-100 text-gray-500 font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !stars || !name.trim() || !email.trim() || !comment.trim()}
              className="flex-[2] bg-[#1B3A6B] text-white font-bold py-3 rounded-xl hover:bg-[#152e55] transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit Review"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
