import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfile } from "./mockData";
import { ContractorProfilePage } from "./ContractorProfilePage";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = getProfile(slug);
  if (!profile || !profile.isPublished) {
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
  const profile = getProfile(slug);

  if (!profile || !profile.isPublished) {
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

  return <ContractorProfilePage profile={profile} />;
}
