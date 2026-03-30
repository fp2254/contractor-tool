"use client";

import { useState } from "react";

const C = {
  navy: "#0f1f3d",
  gold: "#f5a623",
  offWhite: "#f4f5f7",
  lightGray: "#e8ecf2",
  gray: "#8a9ab5",
  green: "#22c55e",
};

type Props = {
  slug: string;
  condensedFont: string;
};

export function ReviewForm({ slug, condensedFont }: Props) {
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
    <div
      style={{
        padding: "0 24px 24px",
        background: "white",
        borderBottom: `1px solid ${C.lightGray}`,
        marginBottom: 8,
      }}
    >
      {done ? (
        <div
          style={{
            background: "#f0fdf4",
            border: `1px solid ${C.green}33`,
            borderRadius: 12,
            padding: "20px 18px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 26, marginBottom: 6 }}>⭐</div>
          <div
            className={condensedFont}
            style={{ fontWeight: 700, fontSize: 16, color: C.navy, marginBottom: 4, textTransform: "uppercase" }}
          >
            Thanks for your review!
          </div>
          <div style={{ fontSize: 13, color: C.gray }}>Your feedback helps other homeowners find great contractors.</div>
        </div>
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            width: "100%",
            background: C.offWhite,
            border: `2px solid ${C.lightGray}`,
            borderRadius: 12,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 16 }}>⭐</span>
          <span
            className={condensedFont}
            style={{ fontWeight: 700, fontSize: 14, color: C.navy, textTransform: "uppercase", letterSpacing: "0.3px" }}
          >
            Leave a Review
          </span>
        </button>
      ) : (
        <form onSubmit={handleSubmit}>
          <div
            className={condensedFont}
            style={{
              fontWeight: 800,
              fontSize: 15,
              color: C.navy,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 14,
            }}
          >
            Write a Review
          </div>

          {/* Star selector */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.gray, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
              Your Rating <span style={{ color: "#ef4444" }}>*</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n)}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(0)}
                  style={{
                    fontSize: 30,
                    background: "none",
                    border: "none",
                    padding: "2px 3px",
                    cursor: "pointer",
                    color: n <= (hovered || stars) ? C.gold : C.lightGray,
                    transition: "color 0.1s",
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            {stars > 0 && (
              <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>
                {["", "Poor", "Fair", "Good", "Great", "Excellent"][stars]}
              </div>
            )}
          </div>

          {/* Name */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.gray, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>
              Your Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name or first + last"
              required
              maxLength={80}
              style={{
                width: "100%",
                border: `1.5px solid ${C.lightGray}`,
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.gray, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>
              Email <span style={{ color: "#ef4444" }}>*</span>
              <span style={{ fontWeight: 400, textTransform: "none", fontSize: 10, marginLeft: 4, letterSpacing: 0 }}>(not shown publicly)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                width: "100%",
                border: `1.5px solid ${C.lightGray}`,
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Job type (optional) */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.gray, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>
              Type of Job <span style={{ fontWeight: 400, textTransform: "none", fontSize: 10, marginLeft: 4, letterSpacing: 0 }}>(optional)</span>
            </label>
            <input
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              placeholder="e.g. Radon mitigation, water testing"
              maxLength={80}
              style={{
                width: "100%",
                border: `1.5px solid ${C.lightGray}`,
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Comment */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.gray, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>
              Your Review <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others about your experience with this contractor…"
              required
              rows={4}
              maxLength={1200}
              style={{
                width: "100%",
                border: `1.5px solid ${C.lightGray}`,
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
                outline: "none",
                resize: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 13, color: "#dc2626" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => { setOpen(false); setError(""); }}
              style={{
                flex: "0 0 auto",
                background: C.offWhite,
                border: `1.5px solid ${C.lightGray}`,
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: C.gray,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !stars || !name.trim() || !email.trim() || !comment.trim()}
              className={condensedFont}
              style={{
                flex: 1,
                background: C.navy,
                border: "none",
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 15,
                fontWeight: 800,
                color: "white",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                cursor: "pointer",
                opacity: submitting || !stars || !name.trim() || !email.trim() || !comment.trim() ? 0.5 : 1,
              }}
            >
              {submitting ? "Submitting…" : "Submit Review"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
