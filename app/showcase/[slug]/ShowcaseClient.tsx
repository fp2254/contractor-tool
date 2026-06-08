"use client";

import Link from "next/link";
import { MapPin, DollarSign, Clock, Shield, FileText, Star, CheckCircle, Award } from "lucide-react";

type Project = {
  id: string;
  title: string;
  contractor_name: string | null;
  description: string | null;
  cost: number | null;
  project_date: string | null;
  completed_date: string | null;
  rating: number | null;
  has_warranty: boolean;
  has_documentation: boolean;
  photos: string[];
  status: string;
};

type Props = {
  contractor: {
    name: string;
    slug: string;
    trade: string;
    location: string;
    photo_url: string | null;
  };
  stats: {
    projectCount: number;
    totalInvested: number;
    avgRating: number | null;
  };
  projects: Project[];
};

const C = {
  navy: "#0f1f3d",
  navyMid: "#1a2f52",
  gold: "#f5a623",
  offWhite: "#f4f5f7",
  lightGray: "#e8ecf2",
  gray: "#8a9ab5",
};

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12} fill={i <= Math.round(rating) ? "#F59E0B" : "none"} stroke={i <= Math.round(rating) ? "#F59E0B" : "#D1D5DB"} />
      ))}
    </span>
  );
}

export default function ShowcaseClient({ contractor, stats, projects }: Props) {
  return (
    <div style={{ backgroundColor: C.offWhite, minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ backgroundColor: C.navy, padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          {contractor.photo_url ? (
            <img src={contractor.photo_url} alt={contractor.name}
              style={{ width: 56, height: 56, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.3)", objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: C.gold, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ color: C.navy, fontWeight: 900, fontSize: 20 }}>{contractor.name.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          <div>
            <h1 style={{ color: "white", fontWeight: 800, fontSize: 18, margin: 0, lineHeight: 1.2 }}>{contractor.name}</h1>
            {contractor.trade && <p style={{ color: C.gold, fontSize: 12, fontWeight: 600, margin: "3px 0 0" }}>{contractor.trade}</p>}
            {contractor.location && (
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, margin: "2px 0 0", display: "flex", alignItems: "center", gap: 3 }}>
                <MapPin size={10} /> {contractor.location}
              </p>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          {[
            { label: "Projects", value: stats.projectCount.toString() },
            { label: "Total Value", value: stats.totalInvested > 0 ? `$${(stats.totalInvested / 1000).toFixed(0)}k` : "—" },
            { label: "Avg Rating", value: stats.avgRating ? `${stats.avgRating.toFixed(1)} ★` : "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: "14px 8px", textAlign: "center" }}>
              <p style={{ color: "white", fontWeight: 800, fontSize: 18, margin: 0 }}>{value}</p>
              <p style={{ color: C.gray, fontSize: 10, margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA bar */}
      <div style={{ backgroundColor: C.navyMid, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: 0 }}>Want work like this?</p>
        <a href={`/pro/${contractor.slug}`}
          style={{ backgroundColor: C.gold, color: C.navy, fontWeight: 800, fontSize: 13, padding: "8px 18px", borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
          Get a Free Quote
        </a>
      </div>

      {/* Projects */}
      <div style={{ padding: "16px 16px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: C.navy, margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Project Portfolio
          </h2>
          <span style={{ fontSize: 11, color: C.gray }}>{stats.projectCount} projects</span>
        </div>

        {projects.length === 0 ? (
          <div style={{ background: "white", borderRadius: 14, padding: "40px 24px", textAlign: "center", border: `2px dashed ${C.lightGray}` }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🏗️</div>
            <p style={{ fontWeight: 700, color: C.navy, fontSize: 15, margin: "0 0 6px" }}>Portfolio coming soon</p>
            <p style={{ color: C.gray, fontSize: 12, margin: 0 }}>Projects being added — check back soon.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {projects.map((proj, idx) => (
              <div key={proj.id} style={{ backgroundColor: "white", borderRadius: 14, overflow: "hidden", border: `1px solid ${C.lightGray}` }}>
                {/* Photos */}
                {proj.photos && (proj.photos as string[]).length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: (proj.photos as string[]).length === 1 ? "1fr" : "repeat(3, 1fr)", gap: 2 }}>
                    {(proj.photos as string[]).slice(0, 3).map((src, i) => (
                      <div key={i} style={{ position: "relative", aspectRatio: "16/9", background: "#d0d8e4", overflow: "hidden" }}>
                        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        {i === 2 && (proj.photos as string[]).length > 3 && (
                          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "white", fontWeight: 800, fontSize: 16 }}>+{(proj.photos as string[]).length - 3}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ padding: "14px 14px 12px" }}>
                  {/* Timeline dot + title */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: C.navy, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <CheckCircle size={13} color="white" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <h3 style={{ fontWeight: 800, fontSize: 14, color: C.navy, margin: 0 }}>{proj.title}</h3>
                        {fmtDate(proj.project_date ?? proj.completed_date) && (
                          <span style={{ fontSize: 10, color: C.gray, flexShrink: 0 }}>{fmtDate(proj.project_date ?? proj.completed_date)}</span>
                        )}
                      </div>
                      {proj.rating && (
                        <div style={{ marginTop: 4 }}>
                          <StarRow rating={proj.rating} />
                        </div>
                      )}
                    </div>
                  </div>

                  {proj.description && (
                    <p style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.5, margin: "0 0 10px", paddingLeft: 32 }}>{proj.description}</p>
                  )}

                  {/* Meta row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", paddingLeft: 32 }}>
                    {proj.cost && (
                      <span style={{ fontSize: 11, color: C.gray, display: "flex", alignItems: "center", gap: 3, fontWeight: 700, color: C.navy }}>
                        <DollarSign size={11} />${proj.cost.toLocaleString()}
                      </span>
                    )}
                    {proj.has_warranty && (
                      <span style={{ fontSize: 10, color: "#16A34A", display: "flex", alignItems: "center", gap: 3, fontWeight: 600 }}>
                        <Shield size={10} />Warranty
                      </span>
                    )}
                    {proj.has_documentation && (
                      <span style={{ fontSize: 10, color: "#2563EB", display: "flex", alignItems: "center", gap: 3, fontWeight: 600 }}>
                        <FileText size={10} />Docs
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: "#16A34A", display: "flex", alignItems: "center", gap: 3, fontWeight: 600, marginLeft: "auto" }}>
                      <Award size={10} />Verified Job
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div style={{ backgroundColor: C.navy, padding: "24px 20px", textAlign: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, margin: "0 0 12px" }}>Ready to get started?</p>
        <a href={`/pro/${contractor.slug}`}
          style={{ display: "inline-block", backgroundColor: C.gold, color: C.navy, fontWeight: 800, fontSize: 15, padding: "14px 32px", borderRadius: 10, textDecoration: "none" }}>
          Get My Free Quote
        </a>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: "14px 0 0" }}>
          Powered by <a href="https://tradebase.contractors" style={{ color: C.gold, textDecoration: "none", fontWeight: 700 }}>TradeBase</a>
        </p>
      </div>
    </div>
  );
}
