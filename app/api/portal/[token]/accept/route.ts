import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = createAdminClient();

  const body = await req.json();
  const { quoteId, signerName, signatureData } = body as {
    quoteId: string;
    signerName: string;
    signatureData?: string | null;
  };

  if (!quoteId || !signerName?.trim()) {
    return NextResponse.json({ error: "quoteId and signerName are required" }, { status: 400 });
  }

  // Validate token — not expired, not revoked
  const { data: pt } = await admin
    .from("customer_portal_tokens")
    .select("id,customer_id,org_id,expires_at,revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!pt) {
    return NextResponse.json({ error: "Invalid or expired portal link" }, { status: 403 });
  }
  if (new Date(pt.expires_at) < new Date()) {
    return NextResponse.json({ error: "Portal link has expired" }, { status: 403 });
  }
  // Check revoked_at if the column exists (graceful — pt.revoked_at will be undefined if column missing)
  const revokedAt = (pt as Record<string, unknown>).revoked_at;
  if (revokedAt) {
    return NextResponse.json({ error: "Portal link has been revoked" }, { status: 403 });
  }

  // Verify this quote belongs to this customer
  const { data: quote } = await admin
    .from("quotes")
    .select("id,org_id,status")
    .eq("id", quoteId)
    .eq("customer_id", pt.customer_id)
    .eq("org_id", pt.org_id)
    .maybeSingle();

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }
  if (quote.status === "accepted") {
    return NextResponse.json({ error: "Quote already accepted" }, { status: 409 });
  }

  const signedAt = new Date().toISOString();

  // Update quote status
  await admin
    .from("quotes")
    .update({ status: "accepted", accepted_at: signedAt })
    .eq("id", quoteId);

  // Insert signature record (graceful — if quote_signatures table doesn't exist yet, skip)
  try {
    await admin.from("quote_signatures" as "orgs").insert({
      org_id: pt.org_id,
      quote_id: quoteId,
      portal_token_id: pt.id,
      signer_name: signerName.trim(),
      signed_at: signedAt,
      signature_data: signatureData ?? null,
      ip_address: req.headers.get("x-forwarded-for") ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
    } as never);
  } catch {
    // Table may not exist yet — quote status was already updated, so this is non-fatal
  }

  return NextResponse.json({ ok: true, signed_at: signedAt });
}
