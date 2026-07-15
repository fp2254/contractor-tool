import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function ProRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/showcase/${slug}`);
}
