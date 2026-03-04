import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { getResendClient, portalEmailHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const body = await req.json() as { customer_id: string };

  if (!body.customer_id) {
    return NextResponse.json({ error: "customer_id required" }, { status: 400 });
  }

  const { data: customer } = await admin
    .from("customers")
    .select("id,first_name,last_name,company_name,email")
    .eq("id", body.customer_id)
    .eq("org_id", orgId!)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  if (!customer.email) {
    return NextResponse.json({ error: "Customer has no email address on file" }, { status: 400 });
  }

  const { data: org } = await admin.from("orgs").select("business_name,phone").eq("id", orgId!).single();
  const businessName = org?.business_name ?? "Your Contractor";

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { data: existing } = await admin
    .from("customer_portal_tokens")
    .select("token,expires_at")
    .eq("org_id", orgId!)
    .eq("customer_id", customer.id)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let token: string;

  if (existing?.token) {
    token = existing.token;
  } else {
    const { data: newToken, error } = await admin
      .from("customer_portal_tokens")
      .insert({
        org_id: orgId!,
        customer_id: customer.id,
        expires_at: expiresAt.toISOString(),
      })
      .select("token")
      .single();

    if (error || !newToken) {
      return NextResponse.json({ error: "Could not create portal token" }, { status: 500 });
    }
    token = newToken.token;
  }

  const host = req.headers.get("host") ?? "localhost:5000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const portalUrl = `${protocol}://${host}/portal/${token}`;

  const customerFirstName = customer.first_name || customer.company_name || "there";

  const { client, fromEmail } = await getResendClient();

  const { error: sendError } = await client.emails.send({
    from: `${businessName} <${fromEmail}>`,
    to: [customer.email],
    subject: `Your documents from ${businessName}`,
    html: portalEmailHtml({
      businessName,
      customerFirstName,
      portalUrl,
      phone: org?.phone ?? null,
    }),
  });

  if (sendError) {
    console.error("Resend portal email error:", sendError);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ success: true, portalUrl, to: customer.email });
}
