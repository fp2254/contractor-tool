import type { MetadataRoute } from "next";

const base = "https://trade-base.biz";

export default function sitemap(): MetadataRoute.Sitemap {
  const marketing = [
    { path: "",           priority: 1,   freq: "weekly" as const },
    { path: "/features",  priority: 0.9, freq: "monthly" as const },
    { path: "/pricing",   priority: 0.9, freq: "monthly" as const },
    { path: "/waitlist",  priority: 0.8, freq: "monthly" as const },
    { path: "/login",     priority: 0.5, freq: "yearly" as const },
    { path: "/privacy",   priority: 0.3, freq: "yearly" as const },
    { path: "/terms",     priority: 0.3, freq: "yearly" as const },
  ];

  const seoPages = [
    "/contractor-software",
    "/plumbing-business-software",
    "/electrician-business-software",
    "/hvac-business-software",
    "/roofing-business-software",
    "/invoice-software-for-contractors",
    "/quote-software-for-contractors",
    "/job-management-app",
    "/contractor-crm",
    "/contractor-estimate-software",
  ].map((path) => ({ path, priority: 0.8, freq: "monthly" as const }));

  return [...marketing, ...seoPages].map(({ path, priority, freq }) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: freq,
    priority,
  }));
}
