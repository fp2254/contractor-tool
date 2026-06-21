import crypto from "crypto";

const LS_API = "https://api.lemonsqueezy.com/v1";

function getApiKey(): string {
  const key = process.env.LEMONSQUEEZY_API_KEY;
  if (!key) throw new Error("LEMONSQUEEZY_API_KEY is not set — add it in Replit Secrets.");
  return key;
}

async function lsRequest(method: string, path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${LS_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as any)?.errors?.[0]?.detail ?? JSON.stringify(data);
    throw new Error(`LemonSqueezy ${res.status}: ${msg}`);
  }
  return data;
}

export async function createCheckoutSession(params: {
  orgId: string;
  userId: string;
  successUrl: string;
  cancelUrl?: string;
}): Promise<string> {
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!variantId) throw new Error("LEMONSQUEEZY_VARIANT_ID is not set — add it in Replit Secrets.");
  if (!storeId) throw new Error("LEMONSQUEEZY_STORE_ID is not set — add it in Replit Secrets.");

  const { orgId, userId, successUrl, cancelUrl } = params;

  const payload = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          custom: {
            org_id: orgId,
            user_id: userId,
            addon_type: "phone_ai",
          },
        },
        product_options: {
          redirect_url: successUrl,
        },
        checkout_options: {
          dark: false,
          button_color: "#1B3A6B",
        },
      },
      relationships: {
        store: { data: { type: "stores", id: storeId } },
        variant: { data: { type: "variants", id: variantId } },
      },
    },
  };

  const response = await lsRequest("POST", "/checkouts", payload);
  const checkoutUrl = response?.data?.attributes?.url as string | undefined;
  if (!checkoutUrl) throw new Error("No checkout URL returned by Lemon Squeezy");
  return checkoutUrl;
}

export function validateLemonSqueezyWebhook(rawBody: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[LemonSqueezy] LEMONSQUEEZY_WEBHOOK_SECRET not set — skipping signature check in dev");
    return process.env.NODE_ENV !== "production";
  }
  if (!signature) return false;
  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}

export type LsSubscriptionStatus =
  | "active"
  | "on_trial"
  | "cancelled"
  | "expired"
  | "paused"
  | "unpaid"
  | "past_due";

export interface LsSubscriptionAttributes {
  status: LsSubscriptionStatus;
  renews_at: string | null;
  ends_at: string | null;
  cancelled: boolean;
  user_email: string | null;
  user_name: string | null;
}

export interface LsWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: Record<string, string>;
  };
  data: {
    id: string;
    type: string;
    attributes: LsSubscriptionAttributes;
  };
}
