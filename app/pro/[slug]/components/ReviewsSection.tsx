import { SectionTitle } from "./SectionTitle";
import type { Review } from "../types";

const C = {
  navy: "#0f1f3d",
  gold: "#f5a623",
  green: "#22c55e",
  gray: "#8a9ab5",
  offWhite: "#f4f5f7",
  lightGray: "#e8ecf2",
};

function StarRow({ count }: { count: number }) {
  return (
    <div style={{ display: "flex", gap: 1, marginTop: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ color: C.gold, fontSize: 11 }}>★</span>
      ))}
    </div>
  );
}

type Props = {
  reviews: Review[];
  condensedFont: string;
};

export function ReviewsSection({ reviews, condensedFont }: Props) {
  return (
    <div
      style={{
        padding: "22px 24px",
        borderBottom: `1px solid ${C.lightGray}`,
        background: "white",
        marginBottom: 8,
      }}
    >
      <SectionTitle condensedFont={condensedFont}>Reviews</SectionTitle>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {reviews.map((review, i) => (
          <div
            key={i}
            style={{
              background: C.offWhite,
              borderRadius: 10,
              padding: "13px 14px",
              marginBottom: 8,
              borderLeft: `3px solid ${C.gold}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.navy, lineHeight: 1.2 }}>
                  {review.name}
                </div>
                <StarRow count={review.stars} />
                <div style={{ fontSize: 11, color: C.gray, marginTop: 3, marginBottom: 6 }}>
                  {review.jobType} · {review.location}
                </div>
              </div>
              {review.verified && (
                <span
                  style={{
                    fontSize: 10,
                    color: C.green,
                    fontWeight: 700,
                    background: "rgba(34,197,94,0.1)",
                    padding: "3px 8px",
                    borderRadius: 10,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                >
                  ✓ Verified Job
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: "#4a5568", lineHeight: 1.45, margin: 0 }}>
              {review.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
