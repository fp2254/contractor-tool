import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { getResendClient, portalEmailHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const body = await req.json() as { customer_id: string; quote_id?: string; reissue?: boolean };

  const { checkDemoBlock } = await import("@/lib/demo");
  const demoBlock = await checkDemoBlock(orgId!, "Portal email sending");
  if (demoBlock) return demoBlock;

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

  const { data: org } = await admin.from("orgs").select("name,phone").eq("id", orgId!).single();
  const businessName = (org as Record<string, unknown> | null)?.name as string ?? "Your Contractor";

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const now = new Date().toISOString();

  // If reissue requested, revoke all existing active tokens for this customer
  if (body.reissue) {
    const { data: existing } = await admin
      .from("customer_portal_tokens")
      .select("id")
      .eq("org_id", orgId!)
      .eq("customer_id", customer.id)
      .gt("expires_at", now);

    if (existing?.length) {
      const ids = existing.map((t) => t.id);
      // Try revoked_at (post-migration), fall back to delete
      const { error: revokeErr } = await admin
        .from("customer_portal_tokens")
        .update({ revoked_at: now } as never)
        .in("id", ids);

      if (revokeErr) {
        await admin.from("customer_portal_tokens").delete().in("id", ids);
      }
    }
  }

  let token: string;

  // Reuse existing valid token if not reissuing
  if (!body.reissue) {
    const { data: existing } = await admin
      .from("customer_portal_tokens")
      .select("token,expires_at")
      .eq("org_id", orgId!)
      .eq("customer_id", customer.id)
      .gt("expires_at", now)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.token) {
      token = existing.token;
    } else {
      const { data: newToken, error } = await admin
        .from("customer_portal_tokens")
        .insert({
          org_id: orgId!,
          customer_id: customer.id,
          expires_at: expiresAt.toISOString(),
          ...(body.quote_id ? { quote_id: body.quote_id } : {}),
        })
        .select("token")
        .single();

      if (error || !newToken) {
        return NextResponse.json({ error: "Could not create portal token" }, { status: 500 });
      }
      token = newToken.token;
    }
  } else {
    const { data: newToken, error } = await admin
      .from("customer_portal_tokens")
      .insert({
        org_id: orgId!,
        customer_id: customer.id,
        expires_at: expiresAt.toISOString(),
        ...(body.quote_id ? { quote_id: body.quote_id } : {}),
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
      phone: (org as Record<string, unknown> | null)?.phone as string ?? null,
    }),
  });

  if (sendError) {
    console.error("Resend portal email error:", sendError);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ success: true, portalUrl, token, to: customer.email });
}
