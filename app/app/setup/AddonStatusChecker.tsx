"use client";

import { useState } from "react";

type AddonInfo = {
  active: boolean;
  status: string;
  priceMonthly: number | null;
  externalSubscriptionId: string | null;
  billingProvider: string | null;
  currentPeriodEnd: string | null;
  activatedAt: string | null;
  notes: string | null;
};

type AddonResult = { addonType: string; addonStatus: AddonInfo };

const ADDON_TYPES = [
  { value: "all", label: "All Add-ons" },
  { value: "phone_ai", label: "Phone AI" },
  { value: "advanced_ai", label: "Advanced AI" },
];

const ADDON_LABELS: Record<string, string> = {
  phone_ai: "Phone AI",
  advanced_ai: "Advanced AI",
};

export default function AddonStatusChecker({ defaultOrgId }: { defaultOrgId: string }) {
  const [orgId, setOrgId] = useState(defaultOrgId);
  const [addonType, setAddonType] = useState("all");
  const [loading, setLoading] = useState(false);
  const [single, setSingle] = useState<{ addonType: string; addonStatus: AddonInfo } | null>(null);
  const [all, setAll] = useState<AddonResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkStatus() {
    const trimmed = orgId.trim();
    if (!trimmed) return;
    setLoading(true);
    setSingle(null);
    setAll(null);
    setError(null);
    try {
      const params = new URLSearchParams({ orgId: trimmed, addonType });
      const res = await fetch(`/api/webhooks/lemonsqueezy/test?${params}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      const json = await res.json();
      if (addonType === "all") {
        setAll(json.results);
      } else {
        setSingle(json);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const info = single?.addonStatus;
  const noRecord = info?.status === "none";

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Check Add-on Status
        </p>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
          Read-only
        </span>
      </div>

      <p className="text-xs text-gray-500">
        Look up the current add-on state for any org without making any changes.
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

      <button
        onClick={checkStatus}
        disabled={loading || !orgId.trim()}
        className="w-full bg-[#1B3A6B] text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50 active:scale-95 transition-transform"
      >
        {loading ? "Checking…" : addonType === "all" ? "Check All" : "Check Status"}
      </button>

      {error && (
        <div className="rounded-xl p-3 text-xs bg-red-50 border border-red-200">
          <p className="text-red-700 font-semibold">Error: {error}</p>
        </div>
      )}

      {all && !error && (
        <div className="rounded-xl p-3 text-xs bg-gray-50 border border-gray-200 space-y-2 overflow-x-auto">
          <p className="font-semibold text-gray-700">Add-on status summary:</p>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200">
                <th className="py-1 pr-2 font-medium">Add-on</th>
                <th className="py-1 pr-2 font-medium">Active</th>
                <th className="py-1 pr-2 font-medium">Status</th>
                <th className="py-1 pr-2 font-medium">Provider</th>
                <th className="py-1 pr-2 font-medium">Price / mo</th>
              </tr>
            </thead>
            <tbody>
              {all.map((row) => {
                const rowNoRecord = row.addonStatus.status === "none";
                return (
                  <tr key={row.addonType} className="border-b border-gray-100 last:border-0">
                    <td className="py-1.5 pr-2 font-semibold text-slate-700">
                      {ADDON_LABELS[row.addonType] ?? row.addonType}
                    </td>
                    <td className="py-1.5 pr-2">
                      <span className={`font-semibold ${row.addonStatus.active ? "text-green-700" : "text-red-600"}`}>
                        {row.addonStatus.active ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 font-mono text-slate-700">
                      {rowNoRecord ? "no record" : row.addonStatus.status}
                    </td>
                    <td className="py-1.5 pr-2 font-mono text-slate-700">
                      {row.addonStatus.billingProvider ?? "—"}
                    </td>
                    <td className="py-1.5 pr-2 font-mono text-slate-700">
                      {row.addonStatus.priceMonthly != null ? `$${row.addonStatus.priceMonthly}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {single && !error && (
        <div className="rounded-xl p-3 text-xs bg-gray-50 border border-gray-200 space-y-2">
          <p className="font-semibold text-gray-700">
            Add-on status for <span className="font-mono">{single.addonType}</span>:
          </p>
          {noRecord ? (
            <p className="text-gray-500 italic">No add-on record found for this org.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-gray-500">Active</span>
              <span className={`font-semibold ${info!.active ? "text-green-700" : "text-red-600"}`}>
                {info!.active ? "Yes" : "No"}
              </span>
              <span className="text-gray-500">Status</span>
              <span className="font-mono font-semibold text-slate-700">{info!.status}</span>
              <span className="text-gray-500">Provider</span>
              <span className="font-mono text-slate-700">{info!.billingProvider ?? "—"}</span>
              <span className="text-gray-500">Sub ID</span>
              <span className="font-mono text-gray-400 truncate">{info!.externalSubscriptionId ?? "—"}</span>
              <span className="text-gray-500">Price / mo</span>
              <span className="font-mono text-slate-700">
                {info!.priceMonthly != null ? `$${info!.priceMonthly}` : "—"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
