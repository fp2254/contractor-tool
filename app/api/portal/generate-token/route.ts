import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getOrigin(req: Request): string {
  const fwdHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const fwdProto = req.headers.get("x-forwarded-proto") ?? "https";
  if (fwdHost) {
    return `${fwdProto.split(",")[0].trim()}://${fwdHost.split(",")[0].trim()}`;
  }
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const body = await req.json() as { customer_id: string; quote_id?: string; invoice_id?: string; reissue?: boolean };
  console.log("[generate-token] body:", JSON.stringify(body));

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

  // If a specific doc is being linked, always reissue so the URL contains the correct invoice/quote path
  if (body.invoice_id || body.quote_id) body.reissue = true;

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
      const origin = getOrigin(req);
      const docPath = body.invoice_id
        ? `/invoice/${body.invoice_id}`
        : body.quote_id
        ? `/quote/${body.quote_id}`
        : "";
      const portalUrl = `${origin}/portal/${existing.token}${docPath}`;
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

  const origin = getOrigin(req);
  const docPath = body.invoice_id
    ? `/invoice/${body.invoice_id}`
    : body.quote_id
    ? `/quote/${body.quote_id}`
    : "";
  const portalUrl = `${origin}/portal/${newToken.token}${docPath}`;

  return NextResponse.json({ token: newToken.token, portalUrl });
}
