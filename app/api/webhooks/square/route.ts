import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function verifySquareSignature(
  body: string,
  signatureHeader: string,
  webhookSecret: string,
  url: string
): boolean {
  const combined = url + body;
  const hmac = crypto
    .createHmac("sha256", webhookSecret)
    .update(combined)
    .digest("base64");
  const expectedSignature = Buffer.from(hmac);
  const receivedSignature = Buffer.from(signatureHeader);

  return (
    expectedSignature.length === receivedSignature.length &&
    crypto.timingSafeEqual(expectedSignature, receivedSignature)
  );
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-square-hmacsha256-signature") ?? "";
  const webhookUrl = process.env.SQUARE_WEBHOOK_URL ?? req.url;

  if (!webhookSecret) {
    console.error("[Square Webhook] SQUARE_WEBHOOK_SIGNATURE_KEY is not configured");
    return NextResponse.json({ error: "Webhook verification is not configured" }, { status: 500 });
  }

  if (!signatureHeader) {
    console.error("[Square Webhook] Missing signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const valid = verifySquareSignature(rawBody, signatureHeader, webhookSecret, webhookUrl);
  if (!valid) {
    console.error("[Square Webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = getAdmin();

  if (event.type === "payment.completed") {
    const payment = event?.data?.object?.payment;
    if (!payment) {
      return NextResponse.json({ error: "No payment object" }, { status: 400 });
    }

    const squareCustomerId: string | undefined = payment.customer_id;
    const subscriptionId: string | undefined =
      payment.subscription_id ?? payment.reference_id;

    const providerId = subscriptionId ?? squareCustomerId;

    if (!providerId) {
      console.error("[Square Webhook] No customer_id or subscription_id found");
      return NextResponse.json({ received: true });
    }

    const { data: sub } = await (admin as any)
      .from("subscriptions")
      .select("id, plan_type")
      .eq("payment_provider_id", providerId)
      .maybeSingle();

    if (!sub) {
      console.warn(`[Square Webhook] No subscription found for provider ID: ${providerId}`);
      return NextResponse.json({ received: true });
    }

    const now = new Date();
    const daysToAdd = sub.plan_type === "yearly" ? 365 : 30;

    const nextDue = new Date(now);
    nextDue.setDate(nextDue.getDate() + daysToAdd);

    const graceEnd = new Date(nextDue);
    graceEnd.setDate(graceEnd.getDate() + 5);

    await (admin as any)
      .from("subscriptions")
      .update({
        payment_date: now.toISOString(),
        next_due_date: nextDue.toISOString(),
        grace_period_end_date: graceEnd.toISOString(),
        subscription_status: "active",
      })
      .eq("id", sub.id);

    console.log(`[Square Webhook] Subscription renewed for provider ID: ${providerId}`);
    return NextResponse.json({ received: true });
  }

  if (event.type === "subscription.updated") {
    const subscription = event?.data?.object?.subscription;
    if (subscription?.status === "CANCELED") {
      const providerId = subscription?.id;
      if (providerId) {
        await (admin as any)
          .from("subscriptions")
          .update({ subscription_status: "canceled" })
          .eq("payment_provider_id", providerId);

        console.log(`[Square Webhook] Subscription canceled for: ${providerId}`);
      }
    }
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
