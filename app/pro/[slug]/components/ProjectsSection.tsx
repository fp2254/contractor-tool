import Image from "next/image";
import { SectionTitle } from "./SectionTitle";
import type { Photo } from "../types";

const C = {
  navy: "#0f1f3d",
  offWhite: "#f4f5f7",
  lightGray: "#e8ecf2",
  gray: "#8a9ab5",
  green: "#22c55e",
};

type Props = {
  photos: Photo[];
  condensedFont: string;
};

export function ProjectsSection({ photos, condensedFont }: Props) {
  return (
    <div
      style={{
        padding: "22px 24px",
        borderBottom: `1px solid ${C.lightGray}`,
        background: "white",
        marginBottom: 8,
      }}
    >
      <SectionTitle condensedFont={condensedFont}>Completed Projects</SectionTitle>

      {photos.length === 0 ? (
        <div
          style={{
            background: C.offWhite,
            border: `2px dashed ${C.lightGray}`,
            borderRadius: 12,
            padding: "28px 24px",
            textAlign: "center",
          }}
        >
          <div
            className={condensedFont}
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: C.gray,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 4,
            }}
          >
            Recent jobs being added
          </div>
          <div style={{ fontSize: 12, color: C.gray }}>
            Project photos being uploaded — check back soon
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 10,
          }}
        >
          {photos.map((photo, i) => (
            <div
              key={i}
              style={{
                borderRadius: 10,
                overflow: "hidden",
                background: C.offWhite,
                border: `1px solid ${C.lightGray}`,
                gridColumn: photo.featured ? "1 / -1" : undefined,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: photo.featured ? "16/9" : "16/10",
                  background: "#d0d8e4",
                }}
              >
                <Image src={photo.url} alt={photo.title} fill style={{ objectFit: "cover" }} />
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: C.green,
                    color: "white",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 20,
                    textTransform: "uppercase",
                    letterSpacing: "0.3px",
                  }}
                >
                  ✓ Verified Job
                </span>
              </div>
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 3 }}>
                  {photo.title}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: C.gray,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{photo.location} · {photo.timeAgo}</span>
                  <span style={{ fontWeight: 700, color: C.navy }}>{photo.cost}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
