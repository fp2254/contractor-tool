"use client";

import { useState } from "react";

type Props = {
  slug: string;
  contractorName: string;
};

export function ReviewForm({ slug, contractorName }: Props) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState("");
  const [jobType, setJobType] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !text.trim() || rating === 0) {
      setError("Please fill in your name, a rating, and your review.");
      return;
    }
    setError("");
    setStatus("sending");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, reviewer_name: name, rating, text, job_type: jobType, location }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Something went wrong."); setStatus("error"); return; }
      setStatus("done");
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#f4f5f7" }}>
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <p className="text-5xl mb-4">🙏</p>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Thanks for your review!</h2>
          <p className="text-sm text-gray-500">
            Your review has been submitted and will appear on the profile once approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-16" style={{ background: "#f4f5f7" }}>
      <div className="max-w-lg mx-auto">
        <div className="mb-6 text-center pt-4">
          <p className="text-sm text-gray-500 mb-1">Reviewing</p>
          <h1 className="text-xl font-bold text-slate-800">{contractorName}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          {/* Star Rating */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-xs font-bold text-gray-400 uppercase mb-3">Your Rating</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="text-4xl transition-transform hover:scale-110 active:scale-95"
                >
                  <span className={(hovered || rating) >= star ? "text-amber-400" : "text-gray-200"}>
                    ★
                  </span>
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-xs text-gray-400 mt-2">
                {["", "Poor", "Fair", "Good", "Great", "Excellent!"][rating]}
              </p>
            )}
          </div>

          {/* Review Text */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Your Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Your Review</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tell others about your experience — quality of work, communication, value for money…"
                rows={4}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                required
              />
            </div>
          </div>

          {/* Optional Details */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase">Optional Details</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type of job</label>
              <input
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                placeholder="e.g. Roof replacement, Siding repair…"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Your location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Portland, ME"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full py-3.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-colors"
            style={{ backgroundColor: "#1B3A6B" }}
          >
            {status === "sending" ? "Submitting…" : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
}
