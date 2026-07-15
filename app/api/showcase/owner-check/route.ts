import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ isOwner: false });

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ isOwner: false });

    const a = createAdminClient() as any;
    const [{ data: pub }, { data: members }] = await Promise.all([
      a.from("public_profiles").select("org_id").eq("slug", slug).maybeSingle(),
      a.from("org_members").select("org_id").eq("user_id", user.id),
    ]);

    const profileOrgId = pub?.org_id;
    const userOrgIds: string[] = (members ?? []).map((m: any) => m.org_id);
    const isOwner = !!profileOrgId && userOrgIds.includes(profileOrgId);

    return NextResponse.json({ isOwner });
  } catch {
    return NextResponse.json({ isOwner: false });
  }
}
