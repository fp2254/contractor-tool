import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import { ContractorProfilePage } from "./ContractorProfilePage";
import { ClassicContractorTemplate } from "@/components/templates/ClassicContractorTemplate";
import { ModernProTemplate } from "@/components/templates/ModernProTemplate";
import { TrustContractorTemplate } from "@/components/templates/TrustContractorTemplate";
import { PortfolioTemplate } from "./components/PortfolioTemplate";
import type { ContractorProfile, ServiceEntry, SectionsConfig, CustomBlock } from "./types";
import { OwnerDebugPanel } from "@/components/OwnerDebugPanel";
import { getProfile as getMockProfile } from "./mockData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ slug: string }>;
};

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

function normalizeServices(raw: unknown[]): ServiceEntry[] {
  return raw.map((s) => {
    if (typeof s === "string") return { name: s, description: "", photo_url: "" };
    const obj = s as Partial<ServiceEntry>;
    return { name: obj.name ?? "", description: obj.description ?? "", photo_url: obj.photo_url ?? "" };
  });
}

function parseAboutBullets(bullets: string[]): { icon: string; text: string }[] {
  return bullets.filter(Boolean).map((b) => {
    const match = b.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
    if (match) {
      return { icon: match[0].trim(), text: b.slice(match[0].length).trim() };
    }
    return { icon: "✓", text: b };
  });
}

async function loadProfile(slug: string): Promise<ContractorProfile | null> {
  const admin = createAdminClient();
  try {
    const { data: pub } = await (admin as any)
      .from("public_profiles")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!pub) return getMockProfile(slug);

    const [{ data: org }, { count: jobsCompleted }, { data: reviewRows }] = await Promise.all([
      admin.from("orgs").select("name").eq("id", pub.org_id).single(),
      (admin as any)
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("org_id", pub.org_id)
        .eq("status", "completed"),
      (admin as any)
        .from("profile_reviews")
        .select("reviewer_name, rating, text, job_type, location, verified, created_at")
        .eq("org_id", pub.org_id)
        .eq("approved", true)
        .order("created_at", { ascending: false }),
    ]);

    const phone = pub.phone ?? "";
    const about = parseAboutBullets(pub.about_bullets ?? []);

    const fetchedReviews = (reviewRows ?? []) as any[];
    const reviewCount = fetchedReviews.length;
    const avgRating = reviewCount > 0
      ? Math.round((fetchedReviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
      : 0;

    const mappedReviews = fetchedReviews.map((r) => ({
      name: r.reviewer_name,
      stars: r.rating,
      text: r.text,
      jobType: r.job_type ?? "",
      location: r.location ?? "",
      verified: r.verified ?? false,
    }));

    const rawHighlights: string[] = Array.isArray(pub.trust_highlights) ? pub.trust_highlights : [];
    const trustItems = rawHighlights
      .filter((t) => typeof t === "string" && t.trim())
      .map((t) => {
        const match = t.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
        if (match) return { icon: match[0].trim(), text: t.slice(match[0].length).trim() };
        return { icon: "✓", text: t.trim() };
      });

    const sectionsConfig: SectionsConfig = (pub.sections_config && typeof pub.sections_config === "object")
      ? pub.sections_config as SectionsConfig
      : {};

    const profile: ContractorProfile = {
      slug: pub.slug,
      isPublished: true,
      name: org?.name ?? "Contractor",
      trade: pub.trade ?? "",
      tagline: pub.tagline ?? "",
      location: pub.service_area ?? "",
      phone: phone.replace(/\D/g, "") ? `tel:${phone.replace(/\D/g, "")}` : "",
      phoneFormatted: formatPhone(phone),
      rating: avgRating,
      reviewCount,
      urgencyLine: pub.urgency_line ?? "",
      stats: {
        jobsCompleted: jobsCompleted ?? 0,
        revenue: pub.revenue_display ?? "",
        yearsExperience: pub.years_experience ?? 0,
      },
      trustItems,
      services: normalizeServices(pub.services ?? []),
      reviews: mappedReviews,
      about,
      licenseNumber: pub.license_text ?? undefined,
      serviceArea: pub.service_area ?? "",
      photoUrl: pub.photo_url || undefined,
      photos: (pub.photos ?? []).map((p: any) => ({
        url: p.url ?? "",
        title: p.title ?? "",
        location: p.location ?? "",
        timeAgo: p.timeAgo ?? "",
        cost: p.cost ?? "",
      })).filter((p: any) => p.url),
      selectedTemplate: pub.selected_template ?? "",
      statLabel: pub.stat_label ?? "",
      sectionsConfig,
      customBlocks: Array.isArray(pub.custom_blocks)
        ? (pub.custom_blocks as CustomBlock[]).filter((b) => b?.title)
        : [],
    };

    return profile;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await loadProfile(slug);
  if (!profile) {
    return { title: "Contractor Not Found | TradeBase" };
  }
  return {
    title: `${profile.name} — ${profile.trade} in ${profile.location} | TradeBase`,
    description: profile.tagline,
    openGraph: {
      title: `${profile.name} — ${profile.trade}`,
      description: profile.tagline,
      type: "profile",
    },
  };
}

async function detectOwner(slug: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const orgId = await ensureUserOrg();
    const admin = createAdminClient() as any;
    const { data: pub } = await admin
      .from("public_profiles")
      .select("org_id")
      .eq("slug", slug)
      .maybeSingle();
    return pub?.org_id === orgId;
  } catch { return false; }
}

function BackBar() {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
      background: "rgba(27,58,107,0.92)", backdropFilter: "blur(6px)",
      padding: "10px 16px", display: "flex", alignItems: "center",
    }}>
      <a href="/app/more" style={{
        display: "flex", alignItems: "center", gap: 6,
        color: "white", fontWeight: 700, fontSize: 13, textDecoration: "none",
      }}>
        ← Back to App
      </a>
    </div>
  );
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const [profile, isOwner] = await Promise.all([loadProfile(slug), detectOwner(slug)]);

  if (!profile) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f5f7",
          padding: "40px 24px",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f1f3d", marginBottom: 8 }}>
          Profile Not Found
        </h1>
        <p style={{ fontSize: 15, color: "#8a9ab5", maxWidth: 320, lineHeight: 1.5, marginBottom: 24 }}>
          This contractor profile doesn&apos;t exist or hasn&apos;t been published yet.
        </p>
        <a
          href="https://tradebase.contractors"
          style={{
            background: "#f5a623",
            color: "#0f1f3d",
            fontWeight: 700,
            fontSize: 15,
            padding: "13px 28px",
            borderRadius: 10,
            textDecoration: "none",
          }}
        >
          Go to TradeBase
        </a>
      </div>
    );
  }

  const portfolioLink = (
    <div style={{ background: "#fff", borderTop: "1px solid #e8ecf2", borderBottom: "1px solid #e8ecf2", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div>
        <p style={{ fontWeight: 700, fontSize: 13, color: "#0f1f3d", margin: 0, textTransform: "uppercase" as const, letterSpacing: "0.4px" }}>
          📁 Project Showcase
        </p>
        <p style={{ fontSize: 11, color: "#8a9ab5", margin: "2px 0 0" }}>
          Browse completed projects with photos &amp; details
        </p>
      </div>
      <a
        href={`/showcase/${slug}`}
        style={{
          background: "#0f1f3d",
          color: "white",
          fontWeight: 700,
          fontSize: 13,
          padding: "9px 18px",
          borderRadius: 8,
          textDecoration: "none",
          whiteSpace: "nowrap" as const,
          flexShrink: 0,
        }}
      >
        View Showcase →
      </a>
    </div>
  );

  const reviewLink = (
    <div style={{ background: "#f4f5f7", borderTop: "1px solid #e5e7eb", padding: "24px 16px", textAlign: "center" }}>
      <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 10 }}>Happy with their work?</p>
      <a
        href={`/pro/${slug}/review`}
        style={{
          display: "inline-block",
          background: "#1B3A6B",
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          padding: "11px 28px",
          borderRadius: 12,
          textDecoration: "none",
        }}
      >
        ✍️ Leave a Review
      </a>
    </div>
  );

  const debugPanel = isOwner ? <OwnerDebugPanel profile={profile} /> : null;

  if (profile.selectedTemplate === "classic") {
    return <>{isOwner && <BackBar />}<ClassicContractorTemplate profile={profile} />{portfolioLink}{reviewLink}{debugPanel}</>;
  }
  if (profile.selectedTemplate === "modern") {
    return <>{isOwner && <BackBar />}<ModernProTemplate profile={profile} />{portfolioLink}{reviewLink}{debugPanel}</>;
  }
  if (profile.selectedTemplate === "trust") {
    return <>{isOwner && <BackBar />}<TrustContractorTemplate profile={profile} />{portfolioLink}{reviewLink}{debugPanel}</>;
  }
  return <>{isOwner && <BackBar />}<PortfolioTemplate profile={profile} />{debugPanel}</>;
}
