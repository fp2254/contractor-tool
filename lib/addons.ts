import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export type AddonStatus = "active" | "trialing" | "canceled" | "paused" | "past_due" | "unpaid" | "none";

export interface AddonInfo {
  active: boolean;
  status: AddonStatus;
  currentPeriodEnd: string | null;
  notes: string | null;
  priceMonthly: number | null;
  activatedAt: string | null;
  externalSubscriptionId: string | null;
  billingProvider: string | null;
}

export async function getAddonStatus(orgId: string, addonType: string): Promise<AddonInfo> {
  const admin = createAdminClient();
  const { data } = await (admin as any)
    .from("org_addons")
    .select("*")
    .eq("org_id", orgId)
    .eq("addon_type", addonType)
    .maybeSingle();

  if (!data) {
    return { active: false, status: "none", currentPeriodEnd: null, notes: null, priceMonthly: null, activatedAt: null, externalSubscriptionId: null, billingProvider: null };
  }

  const now = new Date();
  const periodEnd = data.current_period_end ? new Date(data.current_period_end) : null;

  let active = false;
  if (data.status === "active" || data.status === "trialing") {
    active = periodEnd ? now <= periodEnd : true;
  }

  return {
    active,
    status: (data.status ?? "none") as AddonStatus,
    currentPeriodEnd: data.current_period_end ?? null,
    notes: data.notes ?? null,
    priceMonthly: data.price_monthly ?? null,
    activatedAt: data.activated_at ?? null,
    externalSubscriptionId: data.external_subscription_id ?? null,
    billingProvider: data.billing_provider ?? null,
  };
}

export class AddonNotActiveError extends Error {
  readonly addonType: string;
  constructor(addonType: string) {
    super(`Add-on not active: ${addonType}`);
    this.name = "AddonNotActiveError";
    this.addonType = addonType;
  }
}

const ADDON_DISPLAY: Record<string, string> = {
  phone_ai: "Phone add-on not active",
};

export function addonNotActiveResponse(addonType: string): Response {
  const message = ADDON_DISPLAY[addonType] ?? `Add-on not active: ${addonType}`;
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requireAddon(orgId: string | null, addonType: string): Promise<void> {
  if (!orgId) throw new AddonNotActiveError(addonType);
  const info = await getAddonStatus(orgId, addonType);
  if (!info.active) throw new AddonNotActiveError(addonType);
}

export async function activateAddon(
  orgId: string,
  addonType: string,
  options: { priceMonthly?: number; periodDays?: number; notes?: string } = {}
): Promise<void> {
  const admin = createAdminClient();
  const now = new Date();
  const currentPeriodEnd = options.periodDays
    ? new Date(now.getTime() + options.periodDays * 86_400_000).toISOString()
    : null;

  const { error } = await (admin as any)
    .from("org_addons")
    .upsert(
      {
        org_id: orgId,
        addon_type: addonType,
        status: "active",
        price_monthly: options.priceMonthly ?? null,
        activated_at: now.toISOString(),
        current_period_end: currentPeriodEnd,
        notes: options.notes ?? null,
      },
      { onConflict: "org_id,addon_type" }
    );

  if (error) throw error;
}

export async function deactivateAddon(
  orgId: string,
  addonType: string,
  status: "canceled" | "paused" | "past_due" | "unpaid" = "canceled"
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await (admin as any)
    .from("org_addons")
    .update({ status })
    .eq("org_id", orgId)
    .eq("addon_type", addonType);

  if (error) throw error;
}

export const ADDON_DISPLAY_NAMES: Record<string, string> = {
  phone_ai: "Phone & AI Receptionist",
};

export interface OrgAddonRow extends AddonInfo {
  addonType: string;
  addonName: string;
}

export async function listOrgAddons(orgId: string): Promise<OrgAddonRow[]> {
  const admin = createAdminClient();
  const { data } = await (admin as any)
    .from("org_addons")
    .select("*")
    .eq("org_id", orgId)
    .order("activated_at", { ascending: false });

  if (!data || data.length === 0) return [];

  const now = new Date();

  return (data as any[]).map((row) => {
    const periodEnd = row.current_period_end ? new Date(row.current_period_end) : null;
    let active = false;
    if (row.status === "active" || row.status === "trialing") {
      active = periodEnd ? now <= periodEnd : true;
    }

    return {
      addonType: row.addon_type,
      addonName: ADDON_DISPLAY_NAMES[row.addon_type] ?? row.addon_type,
      active,
      status: (row.status ?? "none") as AddonStatus,
      currentPeriodEnd: row.current_period_end ?? null,
      notes: row.notes ?? null,
      priceMonthly: row.price_monthly ?? null,
      activatedAt: row.activated_at ?? null,
      externalSubscriptionId: row.external_subscription_id ?? null,
      billingProvider: row.billing_provider ?? null,
    };
  });
}

export async function listAllAddonsByType(addonType: string): Promise<Array<{
  org_id: string;
  status: string;
  price_monthly: number | null;
  activated_at: string | null;
  current_period_end: string | null;
  notes: string | null;
}>> {
  const admin = createAdminClient();
  const { data } = await (admin as any)
    .from("org_addons")
    .select("*")
    .eq("addon_type", addonType)
    .order("activated_at", { ascending: false });

  return data ?? [];
}
