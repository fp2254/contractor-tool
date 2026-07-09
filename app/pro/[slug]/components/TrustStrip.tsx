import type { ContractorProfile } from "../types";

type Props = {
  items: ContractorProfile["trustItems"];
};

export function TrustStrip({ items }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 grid grid-cols-2 gap-4">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: "#EAF0FB" }}
          >
            {item.icon}
          </div>
          <span className="text-xs font-bold text-slate-800 leading-tight">
            {item.text}
          </span>
        </div>
      ))}
    </div>
  );
}
