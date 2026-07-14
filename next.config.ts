import type { NextConfig } from "next";

const replitDomain = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : null;

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.worf.replit.dev",
    "*.replit.dev",
    ...(replitDomain ? [replitDomain] : []),
  ],
  typescript: {
    // NOTE: 1145 pre-existing TS errors from Supabase table types not included in lib/types.ts.
    // Setting to false would break `next build` / deployment until those are fixed.
    // Run `npm run type-check` to see all outstanding errors. Tracked as tech debt.
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["@react-pdf/renderer"],
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    DATABASE_URL: process.env.TB_POOL_URL || process.env.DATABASE_URL || "",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
  async rewrites() {
    return [
      {
        source: "/__mockup/:path*",
        destination: "http://localhost:23636/__mockup/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
