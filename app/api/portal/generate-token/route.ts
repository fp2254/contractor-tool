import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const body = await req.json() as { customer_id: string; reissue?: boolean };

  if (!body.customer_id) {
    return NextResponse.json({ error: "customer_id required" }, { status: 400 });
  }

  const { data: customer } = await admin
    .from("customers")
    .select("id")
    .eq("id", body.customer_id)
    .eq("org_id", orgId)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  if (body.reissue) {
    const { data: existing } = await admin
      .from("customer_portal_tokens")
      .select("id")
      .eq("org_id", orgId)
      .eq("customer_id", customer.id)
      .gt("expires_at", now);
    if (existing?.length) {
      const ids = existing.map((t) => t.id);
      const { error: revokeErr } = await admin
        .from("customer_portal_tokens")
        .update({ revoked_at: now } as never)
        .in("id", ids);
      if (revokeErr) {
        await admin.from("customer_portal_tokens").delete().in("id", ids);
      }
    }
  } else {
    const { data: existing } = await admin
      .from("customer_portal_tokens")
      .select("token")
      .eq("org_id", orgId)
      .eq("customer_id", customer.id)
      .gt("expires_at", now)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.token) {
      const host = req.headers.get("host") ?? "localhost:5000";
      const protocol = host.includes("localhost") ? "http" : "https";
      const portalUrl = `${protocol}://${host}/portal/${existing.token}`;
      return NextResponse.json({ token: existing.token, portalUrl });
    }
  }

  const { data: newToken, error } = await admin
    .from("customer_portal_tokens")
    .insert({
      org_id: orgId,
      customer_id: customer.id,
      expires_at: expiresAt.toISOString(),
    })
    .select("token")
    .single();

  if (error || !newToken) {
    return NextResponse.json({ error: "Could not create portal token" }, { status: 500 });
  }

  const host = req.headers.get("host") ?? "localhost:5000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const portalUrl = `${protocol}://${host}/portal/${newToken.token}`;

  return NextResponse.json({ token: newToken.token, portalUrl });
}
