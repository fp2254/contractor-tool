import { Award, Home, DollarSign } from "lucide-react";
import type { ContractorProfile } from "../types";

type Props = {
  stats: ContractorProfile["stats"];
};

export function StatsBar({ stats }: Props) {
  const items = [
    stats.yearsExperience > 0
      ? { icon: Award, value: `${stats.yearsExperience}+`, label: "Years Experience" }
      : null,
    stats.jobsCompleted > 0
      ? { icon: Home, value: String(stats.jobsCompleted), label: "Jobs Completed" }
      : null,
    stats.revenue && stats.revenue.trim() !== "" && stats.revenue !== "0"
      ? { icon: DollarSign, value: stats.revenue, label: "Work Completed" }
      : null,
  ].filter((x): x is { icon: any; value: string; label: string } => x !== null);

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map(({ icon: Icon, value, label }, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center">
          <div className="w-9 h-9 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: "#EAF0FB" }}>
            <Icon size={16} style={{ color: "#1B3A6B" }} />
          </div>
          <p className="text-lg font-bold text-slate-800 leading-none">{value}</p>
          <p className="text-[11px] text-gray-500 mt-1 leading-tight">{label}</p>
        </div>
      ))}
    </div>
  );
}
