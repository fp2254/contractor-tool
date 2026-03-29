import type { ContractorProfile } from "../types";

const C = {
  navyMid: "#1a2f52",
  gold: "#f5a623",
};

type Props = {
  stats: ContractorProfile["stats"];
  condensedFont: string;
};

export function StatsBar({ stats, condensedFont }: Props) {
  const items = [
    { value: String(stats.jobsCompleted), label: "Jobs\nCompleted" },
    { value: stats.revenue, label: "In Completed\nWork" },
    { value: `${stats.yearsExperience} yrs`, label: "Experience" },
  ];

  return (
    <div
      style={{
        backgroundColor: C.navyMid,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            padding: "14px 10px",
            textAlign: "center",
            borderRight: i < items.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
          }}
        >
          <div
            className={condensedFont}
            style={{ fontWeight: 800, fontSize: 20, color: C.gold, lineHeight: 1 }}
          >
            {item.value}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.5)",
              marginTop: 3,
              lineHeight: 1.3,
              whiteSpace: "pre-line",
            }}
          >
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
