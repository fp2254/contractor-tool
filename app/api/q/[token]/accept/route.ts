import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = createAdminClient();

  const body = await req.json();
  const signatureName = String(body.signatureName ?? "").trim();
  const quoteId = String(body.quoteId ?? "").trim();

  if (!signatureName) {
    return NextResponse.json({ error: "Signature name is required" }, { status: 400 });
  }

  const { data: quote } = await admin
    .from("quotes")
    .select("id, status, public_token")
    .eq("id", quoteId)
    .eq("public_token", token)
    .maybeSingle();

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (quote.status === "accepted") {
    return NextResponse.json({ error: "Quote already accepted" }, { status: 409 });
  }

  const acceptedAt = new Date().toISOString();

  const { error } = await admin
    .from("quotes")
    .update({
      status: "accepted",
      accepted_at: acceptedAt,
      accepted_signature_name: signatureName,
    })
    .eq("id", quoteId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, accepted_at: acceptedAt });
}
