"use client";

import { SectionTitle } from "./SectionTitle";
import type { ServiceEntry } from "../types";

type Props = {
  services: ServiceEntry[];
};

export function ServicesSection({ services }: Props) {
  const withPhoto = services.filter((s) => s.photo_url);
  const withoutPhoto = services.filter((s) => !s.photo_url);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
      <SectionTitle>Services</SectionTitle>

      {/* Photo cards for services that have an example photo */}
      {withPhoto.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {withPhoto.map((svc, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50"
            >
              <div className="relative w-full aspect-[4/3] bg-gray-200">
                <img
                  src={svc.photo_url}
                  alt={svc.name}
                  className="w-full h-full object-cover block"
                />
              </div>
              <div className="p-2.5 text-xs font-bold text-slate-800 tracking-tight">
                {svc.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plain pill chips for services without a photo */}
      {withoutPhoto.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {withoutPhoto.map((svc, i) => (
            <span
              key={i}
              className="bg-[#EAF0FB] text-[#1B3A6B] text-[11px] font-bold px-3 py-1.5 rounded-lg border border-[#1B3A6B]/5"
            >
              {svc.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
