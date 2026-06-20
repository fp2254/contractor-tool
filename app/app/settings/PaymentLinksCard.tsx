"use client";

import { useState, useEffect } from "react";

interface PaymentLinks {
  venmo?: string;
  cashapp?: string;
  paypal?: string;
  zelle?: string;
  custom_label?: string;
  custom_url?: string;
}

interface Props {
  squareConnected: boolean;
  initial: PaymentLinks;
}

export function PaymentLinksCard({ squareConnected, initial }: Props) {
  const [links, setLinks] = useState<PaymentLinks>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => { setLinks(initial); }, [initial]);

  function set(key: keyof PaymentLinks, val: string) {
    setLinks((prev) => ({ ...prev, [key]: val }));
    setStatus("idle");
  }

  async function save() {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/profile/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(links),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">How Customers Pay You</p>
        <p className="text-[11px] text-gray-400 mt-0.5">Fill in the ones you use — they&apos;ll appear on invoices and in the customer portal.</p>
      </div>

      <div className="px-4 py-4 space-y-3">

        {/* Square row */}
        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⬛</span>
            <div>
              <p className="text-sm font-medium text-slate-700">Square</p>
              <p className="text-[11px] text-gray-400">Connected via OAuth</p>
            </div>
          </div>
          {squareConnected ? (
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">Connected</span>
          ) : (
            <a href="/app/settings?square=connect"
              className="text-xs font-semibold text-[#1B3A6B] bg-blue-50 px-2.5 py-1 rounded-full">
              Connect
            </a>
          )}
        </div>

        {/* Venmo */}
        <PayRow
          icon="💜"
          label="Venmo"
          placeholder="@YourHandle"
          value={links.venmo ?? ""}
          onChange={(v) => set("venmo", v)}
          hint="venmo.com/u/YourHandle"
        />

        {/* Cash App */}
        <PayRow
          icon="💚"
          label="Cash App"
          placeholder="$YourCashTag"
          value={links.cashapp ?? ""}
          onChange={(v) => set("cashapp", v)}
          hint="cash.app/$YourCashTag"
        />

        {/* PayPal */}
        <PayRow
          icon="🔵"
          label="PayPal"
          placeholder="your-username"
          value={links.paypal ?? ""}
          onChange={(v) => set("paypal", v)}
          hint="paypal.me/your-username"
        />

        {/* Zelle */}
        <PayRow
          icon="🟣"
          label="Zelle"
          placeholder="Phone or email"
          value={links.zelle ?? ""}
          onChange={(v) => set("zelle", v)}
          hint="Displayed as text (no link)"
        />

        {/* Custom */}
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5">Other (custom)</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={links.custom_label ?? ""}
              onChange={(e) => set("custom_label", e.target.value)}
              placeholder="Label (e.g. Bank Transfer)"
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            <input
              value={links.custom_url ?? ""}
              onChange={(e) => set("custom_url", e.target.value)}
              placeholder="https://..."
              type="url"
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: "#1B3A6B" }}>
          {saving ? "Saving…" : status === "saved" ? "✓ Saved" : "Save Payment Links"}
        </button>

        {status === "error" && (
          <p className="text-xs text-red-500 text-center">Something went wrong — try again.</p>
        )}
      </div>
    </div>
  );
}

function PayRow({
  icon, label, placeholder, value, onChange, hint,
}: {
  icon: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <label className="text-xs font-semibold text-gray-600">{label}</label>
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
      />
      {value.trim() && (
        <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>
      )}
    </div>
  );
}
