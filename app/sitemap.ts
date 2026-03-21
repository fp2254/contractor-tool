import type { MetadataRoute } from "next";

const base = "https://tradebase.replit.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const marketing = [
    { path: "",                  priority: 1.0, freq: "weekly"  as const },
    { path: "/features",         priority: 0.9, freq: "monthly" as const },
    { path: "/pricing",          priority: 0.9, freq: "monthly" as const },
    { path: "/contact",          priority: 0.6, freq: "yearly"  as const },
    { path: "/waitlist",         priority: 0.7, freq: "monthly" as const },
    { path: "/privacy",          priority: 0.2, freq: "yearly"  as const },
    { path: "/terms",            priority: 0.2, freq: "yearly"  as const },
  ];

  const tradePages = [
    "/for-handyman",
    "/for-plumbers",
    "/for-electricians",
    "/for-hvac",
    "/for-general-contractors",
  ];

  const originalSeoPages = [
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
  ];

  const newSeoPages = [
    // Invoice pages
    "/contractor-invoice-app",
    "/create-invoice-on-phone",
    "/free-contractor-invoice-template",
    "/invoice-app-for-handyman",
    "/invoice-app-for-plumbers",
    "/invoice-app-for-electricians",
    "/invoice-app-for-hvac",
    "/field-invoice-app",
    "/how-contractors-send-invoices-fast",
    // Quote & estimate pages
    "/contractor-quote-app",
    "/contractor-estimating-app",
    "/how-to-send-an-estimate-from-phone",
    "/estimate-template-for-contractors",
    // Business operations pages
    "/job-tracking-for-contractors",
    "/how-to-organize-contractor-jobs",
    "/how-to-track-customers-as-a-contractor",
    "/small-contractor-business-software",
    "/best-app-for-small-contractor-business",
    "/phone-app-for-contractors",
    "/contractor-crm-simple",
  ];

  const allSeoPages = [...tradePages, ...originalSeoPages, ...newSeoPages].map(
    (path) => ({ path, priority: 0.8, freq: "monthly" as const })
  );

  return [...marketing, ...allSeoPages].map(({ path, priority, freq }) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: freq,
    priority,
  }));
}
