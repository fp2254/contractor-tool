import type { ContractorProfile } from "../types";

const C = {
  navy: "#0f1f3d",
  gold: "#f5a623",
  green: "#22c55e",
  gray: "#8a9ab5",
};

type Props = {
  review: ContractorProfile["featuredReview"];
};

export function FeaturedReview({ review }: Props) {
  return (
    <div
      style={{
        background: "white",
        padding: "20px 24px",
        marginBottom: 8,
        borderLeft: `4px solid ${C.gold}`,
      }}
    >
      <div
        style={{
          fontSize: 28,
          color: C.gold,
          lineHeight: 1,
          marginBottom: 6,
          fontFamily: "Georgia, serif",
        }}
      >
        &ldquo;
      </div>
      <p
        style={{
          fontSize: 15,
          color: "#2d3748",
          lineHeight: 1.55,
          fontStyle: "italic",
          marginBottom: 10,
        }}
      >
        {review.text}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, lineHeight: 1.2 }}>
            {review.reviewer}
          </div>
          <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>
            {review.jobType} · {review.location}
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            color: C.green,
            fontWeight: 700,
            background: "rgba(34,197,94,0.1)",
            padding: "3px 8px",
            borderRadius: 10,
            whiteSpace: "nowrap",
          }}
        >
          ✓ Verified Job
        </span>
      </div>
    </div>
  );
}
