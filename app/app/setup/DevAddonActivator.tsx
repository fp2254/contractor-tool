"use client";

import { useState } from "react";

type AddonStatus = {
  active: boolean;
  status: string | null;
  addon_type: string | null;
  price_monthly: number | null;
  external_subscription_id: string | null;
  billing_provider: string | null;
} | null;

type Result = {
  ok: boolean;
  simulated?: { event: string; orgId: string; addonType: string; subscriptionId: string; lsStatus: string };
  addonStatus?: AddonStatus;
  error?: string;
};

const ADDON_TYPES = [
  { value: "phone_ai", label: "Phone AI" },
];

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "on_trial", label: "On Trial" },
  { value: "past_due", label: "Past Due" },
  { value: "paused", label: "Paused" },
  { value: "cancelled", label: "Cancelled" },
];

export default function DevAddonActivator({ defaultOrgId }: { defaultOrgId: string }) {
  const [orgId, setOrgId] = useState(defaultOrgId);
  const [addonType, setAddonType] = useState("phone_ai");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function callEndpoint(event: string, status?: string) {
    if (!orgId.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const body: Record<string, string> = { event, orgId: orgId.trim(), addonType };
      if (status) body.status = status;

      const res = await fetch("/api/webhooks/lemonsqueezy/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      setResult(json);
    } catch {
      setResult({ ok: false, error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  const status = result?.addonStatus;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Manually Activate Add-on
        </p>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
          Dev / Admin Only
        </span>
      </div>

      <p className="text-xs text-gray-500">
        Simulates a LemonSqueezy webhook without real billing credentials. Not available in production.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Org ID</label>
          <input
            type="text"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            placeholder="uuid…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Add-on Type</label>
          <select
            value={addonType}
            onChange={(e) => setAddonType(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30 bg-white"
          >
            {ADDON_TYPES.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => callEndpoint("subscription_created", "active")}
          disabled={loading || !orgId.trim()}
          className="flex-1 min-w-[120px] bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50 active:scale-95 transition-transform"
        >
          ✓ Activate
        </button>
        <button
          onClick={() => callEndpoint("subscription_created", "on_trial")}
          disabled={loading || !orgId.trim()}
          className="flex-1 min-w-[120px] bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50 active:scale-95 transition-transform"
        >
          ⏳ Trial
        </button>
        <button
          onClick={() => callEndpoint("subscription_cancelled")}
          disabled={loading || !orgId.trim()}
          className="flex-1 min-w-[120px] bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50 active:scale-95 transition-transform"
        >
          ✗ Deactivate
        </button>
      </div>

      {loading && (
        <p className="text-xs text-gray-400 text-center animate-pulse">Simulating webhook…</p>
      )}

      {result && (
        <div className={`rounded-xl p-3 text-xs space-y-2 ${result.ok ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          {result.error ? (
            <p className="text-red-700 font-semibold">Error: {result.error}</p>
          ) : (
            <>
              <p className={`font-bold ${result.ok ? "text-green-700" : "text-red-700"}`}>
                {result.ok ? "✓ Success" : "✗ Failed"}
              </p>
              {result.simulated && (
                <p className="text-gray-600">
                  Event: <span className="font-mono font-semibold">{result.simulated.event}</span>
                  {" · "}Status: <span className="font-mono font-semibold">{result.simulated.lsStatus}</span>
                  {" · "}Sub: <span className="font-mono text-gray-400">{result.simulated.subscriptionId}</span>
                </p>
              )}
              {status !== undefined && (
                <div className="pt-1 border-t border-current/10 space-y-1">
                  <p className="font-semibold text-gray-700">Resulting add-on status:</p>
                  {status === null ? (
                    <p className="text-gray-500 italic">No add-on record found for this org</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <span className="text-gray-500">Active</span>
                      <span className={`font-semibold ${status.active ? "text-green-700" : "text-red-600"}`}>
                        {status.active ? "Yes" : "No"}
                      </span>
                      <span className="text-gray-500">Status</span>
                      <span className="font-mono font-semibold text-slate-700">{status.status ?? "—"}</span>
                      <span className="text-gray-500">Provider</span>
                      <span className="font-mono text-slate-700">{status.billing_provider ?? "—"}</span>
                      <span className="text-gray-500">Sub ID</span>
                      <span className="font-mono text-gray-400 truncate">{status.external_subscription_id ?? "—"}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
