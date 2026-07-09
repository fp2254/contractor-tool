import { SectionTitle } from "./SectionTitle";
import type { ContractorProfile } from "../types";
import { Handshake } from "lucide-react";

type Props = {
  about: ContractorProfile["about"];
  licenseNumber?: string;
};

export function AboutSection({ about, licenseNumber }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
      <SectionTitle>About</SectionTitle>

      <ul className="flex flex-col gap-3">
        {about.map((item, i) => (
          <li key={i} className="flex items-center gap-3 text-sm text-gray-600 font-medium">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: "#EAF0FB" }}
            >
              {item.icon}
            </div>
            {item.text}
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 mt-4 text-xs font-medium text-gray-500">
        <Handshake size={14} style={{ color: "#1B3A6B" }} />
        TradeBase Verified Contractor
        {licenseNumber && <span className="ml-auto opacity-60">License #{licenseNumber}</span>}
      </div>
    </div>
  );
}
