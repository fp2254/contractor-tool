import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const body = await req.json() as { email?: string };

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const { data: orgData } = await admin
    .from("orgs")
    .select("name")
    .eq("id", orgId!)
    .maybeSingle();

  const orgName = (orgData as { name?: string } | null)?.name ?? "TradeBase";

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { invited_org_id: orgId, invited_org_name: orgName },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://tradebase.contractors"}/app`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
