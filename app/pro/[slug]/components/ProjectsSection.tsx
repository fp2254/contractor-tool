import Image from "next/image";
import { SectionTitle } from "./SectionTitle";
import type { Photo } from "../types";
import { BadgeCheck } from "lucide-react";

type Props = {
  photos: Photo[];
};

export function ProjectsSection({ photos }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
      <SectionTitle>Completed Projects</SectionTitle>

      {photos.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
          <div className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-1">
            Recent jobs being added
          </div>
          <div className="text-xs text-gray-400">
            Project photos being uploaded — check back soon
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo, i) => (
            <div
              key={i}
              className={`rounded-xl overflow-hidden bg-gray-50 border border-gray-100 ${photo.featured ? "col-span-2" : ""}`}
            >
              <div
                className={`relative w-full bg-gray-200 ${photo.featured ? "aspect-video" : "aspect-[16/10]"}`}
              >
                <Image src={photo.url} alt={photo.title} fill style={{ objectFit: "cover" }} />
                <span className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight flex items-center gap-1">
                  <BadgeCheck size={10} />
                  Verified
                </span>
              </div>
              <div className="p-3">
                <div className="font-bold text-xs text-slate-800 mb-0.5 truncate">
                  {photo.title}
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-500">
                  <span>{photo.location} · {photo.timeAgo}</span>
                  <span className="font-bold text-[#1B3A6B]">{photo.cost}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
