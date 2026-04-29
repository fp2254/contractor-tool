import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContractorProfilePage } from "./ContractorProfilePage";
import { ClassicContractorTemplate } from "@/components/templates/ClassicContractorTemplate";
import { ModernProTemplate } from "@/components/templates/ModernProTemplate";
import type { ContractorProfile, ServiceEntry } from "./types";

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

    if (!pub) return null;

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
      trustItems: [
        { icon: "⚡", text: "Same-Day Response" },
        { icon: "💬", text: "Transparent Pricing" },
        { icon: "🛡️", text: "Licensed & Insured" },
        { icon: "📍", text: "Local Contractor" },
      ],
      services: normalizeServices(pub.services ?? []),
      photos: [],
      reviews: mappedReviews,
      about,
      licenseNumber: pub.license_text ?? undefined,
      serviceArea: pub.service_area ?? "",
      photoUrl: pub.photo_url || undefined,
      selectedTemplate: pub.selected_template ?? "",
      statLabel: pub.stat_label ?? "",
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

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const profile = await loadProfile(slug);

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

  if (profile.selectedTemplate === "classic") {
    return <ClassicContractorTemplate profile={profile} />;
  }
  if (profile.selectedTemplate === "modern") {
    return <ModernProTemplate profile={profile} />;
  }
  return <ContractorProfilePage profile={profile} />;
}
