"use client";

import { useState } from "react";

const BILLING_ACTION_ADDONS = new Set(["phone_ai"]);

export function BillingCard({
  addonName,
  addonType,
  currentPeriodEnd,
  priceMonthly,
  status,
  hasSubscriptionId,
  standalone = true,
  borderTop = false,
}: {
  addonName?: string;
  addonType?: string;
  currentPeriodEnd: string | null;
  priceMonthly: number | null;
  status: string;
  hasSubscriptionId: boolean;
  standalone?: boolean;
  borderTop?: boolean;
}) {
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const isActive = status === "active" || status === "trialing";
  const isCanceled = status === "canceled" || status === "expired";

  const renewalLabel = (() => {
    if (!currentPeriodEnd) return null;
    const d = new Date(currentPeriodEnd);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  })();

  async function openPortal() {
    setLoadingPortal(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/billing/portal-url");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not open billing portal");
      window.open(data.portalUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setPortalError(e.message ?? "Something went wrong");
    } finally {
      setLoadingPortal(false);
    }
  }

  async function resubscribe() {
    setLoadingCheckout(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      setCheckoutError(e.message ?? "Something went wrong");
      setLoadingCheckout(false);
    }
  }

  const inner = (
    <div className={`px-4 py-4 space-y-3${borderTop ? " border-t border-gray-100" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          {addonName ?? "Plan"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">
            ${priceMonthly ?? 29}<span className="font-normal text-gray-400">/mo</span>
          </span>
          {isActive && (
            <span className="text-[11px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
          )}
          {isCanceled && (
            <span className="text-[11px] font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Canceled</span>
          )}
          {status === "paused" && (
            <span className="text-[11px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Paused</span>
          )}
          {(status === "past_due" || status === "unpaid") && (
            <span className="text-[11px] font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Payment issue</span>
          )}
        </div>
      </div>

      {renewalLabel && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            {isCanceled ? "Access until" : "Renews"}
          </span>
          <span className="text-sm text-slate-600">{renewalLabel}</span>
        </div>
      )}

      {isActive && BILLING_ACTION_ADDONS.has(addonType ?? "") && hasSubscriptionId && (
        <div className="pt-1">
          <button
            onClick={openPortal}
            disabled={loadingPortal}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-slate-700 bg-gray-50 active:bg-gray-100 disabled:opacity-60 transition-colors">
            {loadingPortal ? "Opening…" : "Manage Billing"}
          </button>
          {portalError && <p className="text-xs text-red-600 mt-1.5 text-center">{portalError}</p>}
          <p className="text-[11px] text-gray-400 text-center mt-1.5">
            Update payment method or cancel — powered by Lemon Squeezy
          </p>
        </div>
      )}

      {isActive && BILLING_ACTION_ADDONS.has(addonType ?? "") && !hasSubscriptionId && (
        <div className="pt-1">
          <p className="text-xs text-gray-400 text-center">
            To manage your subscription, check your Lemon Squeezy confirmation email.
          </p>
        </div>
      )}

      {isCanceled && BILLING_ACTION_ADDONS.has(addonType ?? "") && (
        <div className="pt-1">
          <button
            onClick={resubscribe}
            disabled={loadingCheckout}
            className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-opacity"
            style={{ backgroundColor: "#1B3A6B" }}>
            {loadingCheckout ? "Loading checkout…" : "Resubscribe — $29/mo"}
          </button>
          {checkoutError && <p className="text-xs text-red-600 mt-1.5 text-center">{checkoutError}</p>}
        </div>
      )}
    </div>
  );

  if (!standalone) return inner;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-1 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Billing</p>
      </div>
      {inner}
    </div>
  );
}
