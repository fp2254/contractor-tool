import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewForm } from "./ReviewForm";

type Props = { params: Promise<{ slug: string }> };

export default async function ReviewPage({ params }: Props) {
  const { slug } = await params;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pub } = await (admin as any)
    .from("public_profiles")
    .select("org_id, is_published")
    .eq("slug", slug)
    .maybeSingle();

  if (!pub?.is_published) notFound();

  const { data: org } = await admin
    .from("orgs")
    .select("name")
    .eq("id", pub.org_id)
    .single();

  return (
    <ReviewForm
      slug={slug}
      contractorName={org?.name ?? "This Contractor"}
    />
  );
}
