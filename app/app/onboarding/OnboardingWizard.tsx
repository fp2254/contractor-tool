"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Preset = { name: string; price: string; selected: boolean };

const TRADES = [
  { label: "Roofing",       emoji: "🏠" },
  { label: "HVAC",          emoji: "🌡️" },
  { label: "Plumbing",      emoji: "🪠" },
  { label: "Electrical",    emoji: "⚡" },
  { label: "Radon",         emoji: "☢️" },
  { label: "Painting",      emoji: "🖌️" },
  { label: "Flooring",      emoji: "🪵" },
  { label: "Landscaping",   emoji: "🌿" },
  { label: "Pest Control",  emoji: "🦟" },
  { label: "Handyman",      emoji: "🔧" },
  { label: "Remodeling",    emoji: "🏗️" },
  { label: "Concrete",      emoji: "🧱" },
  { label: "Solar",         emoji: "☀️" },
  { label: "General",       emoji: "⚙️" },
  { label: "Other",         emoji: "📋" },
];

const TRADE_PRESETS: Record<string, { name: string; price: number }[]> = {
  Roofing:     [{ name: "Roof Inspection", price: 150 }, { name: "Shingle Replacement", price: 850 }, { name: "Gutter Cleaning", price: 200 }, { name: "Emergency Repair", price: 350 }, { name: "Full Roof Replacement", price: 8500 }],
  HVAC:        [{ name: "Service Call", price: 125 }, { name: "Filter Replacement", price: 75 }, { name: "AC Installation", price: 4500 }, { name: "Furnace Tune-Up", price: 150 }, { name: "Emergency Repair", price: 250 }],
  Plumbing:    [{ name: "Service Call", price: 125 }, { name: "Drain Cleaning", price: 175 }, { name: "Leak Repair", price: 250 }, { name: "Water Heater Install", price: 1200 }, { name: "Toilet Replacement", price: 350 }],
  Electrical:  [{ name: "Service Call", price: 150 }, { name: "Outlet Installation", price: 200 }, { name: "Panel Inspection", price: 250 }, { name: "Panel Upgrade", price: 2500 }, { name: "Emergency Call", price: 300 }],
  Radon:       [{ name: "Radon Test", price: 150 }, { name: "Mitigation System", price: 1800 }, { name: "Fan Replacement", price: 650 }, { name: "Annual Re-Test", price: 150 }, { name: "Water Filtration", price: 3200 }],
  Painting:    [{ name: "Interior Room", price: 400 }, { name: "Exterior Painting", price: 2500 }, { name: "Prep & Prime", price: 350 }, { name: "Trim Work", price: 300 }, { name: "Cabinet Refinishing", price: 800 }],
  Flooring:    [{ name: "Floor Installation", price: 1800 }, { name: "Hardwood Refinishing", price: 1200 }, { name: "Tile Work", price: 1500 }, { name: "Subfloor Repair", price: 600 }, { name: "Carpet Install", price: 1200 }],
  Landscaping: [{ name: "Lawn Mowing", price: 75 }, { name: "Spring Cleanup", price: 350 }, { name: "Fall Cleanup", price: 350 }, { name: "Mulching", price: 400 }, { name: "Tree Trimming", price: 500 }],
  "Pest Control": [{ name: "Initial Inspection", price: 150 }, { name: "Treatment", price: 200 }, { name: "Follow-Up Visit", price: 125 }, { name: "Termite Inspection", price: 250 }, { name: "Exclusion Work", price: 600 }],
  Handyman:    [{ name: "Service Call", price: 100 }, { name: "Labor (per hour)", price: 85 }, { name: "Furniture Assembly", price: 150 }, { name: "Door Repair", price: 200 }, { name: "Drywall Patch", price: 250 }],
  Remodeling:  [{ name: "Consultation", price: 200 }, { name: "Demolition", price: 800 }, { name: "Framing", price: 2500 }, { name: "Drywall", price: 1800 }, { name: "Finish Work", price: 2000 }],
  Concrete:    [{ name: "Driveway Pour", price: 3500 }, { name: "Concrete Repair", price: 500 }, { name: "Stamped Concrete", price: 4500 }, { name: "Foundation Work", price: 6000 }, { name: "Sidewalk", price: 1200 }],
  Solar:       [{ name: "Site Assessment", price: 250 }, { name: "System Installation", price: 18000 }, { name: "Battery Storage", price: 8000 }, { name: "Maintenance Visit", price: 200 }, { name: "System Inspection", price: 300 }],
  General:     [{ name: "Consultation", price: 150 }, { name: "Labor (per hour)", price: 85 }, { name: "Materials", price: 0 }, { name: "Cleanup", price: 200 }, { name: "Project Management", price: 0 }],
  Other:       [{ name: "Service Call", price: 100 }, { name: "Labor (per hour)", price: 85 }, { name: "Materials", price: 0 }, { name: "Inspection", price: 150 }, { name: "Emergency Visit", price: 250 }],
};

const PAYMENT_METHODS = [
  { id: "cash",    label: "Cash" },
  { id: "check",   label: "Check" },
  { id: "zelle",   label: "Zelle" },
  { id: "venmo",   label: "Venmo" },
  { id: "paypal",  label: "PayPal" },
  { id: "square",  label: "Square" },
  { id: "card",    label: "Credit Card" },
  { id: "ach",     label: "Bank Transfer" },
];

const TOTAL_STEPS = 5;

const inputCls = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white";
const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

export default function OnboardingWizard({
  businessName: initialBiz,
  ownerName: initialOwner,
}: {
  businessName: string;
  ownerName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  const [form, setForm] = useState({
    business_name: initialBiz,
    owner_name: initialOwner,
    trade: "",
    phone: "",
    city: "",
    state: "",
    service_area: "",
    payment_methods: ["cash", "check"],
    payment_instructions: "",
  });

  const [presets, setPresets] = useState<Preset[]>([]);

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function selectTrade(trade: string) {
    set("trade", trade);
    const suggested = (TRADE_PRESETS[trade] ?? TRADE_PRESETS.Other).map(p => ({
      name: p.name,
      price: p.price > 0 ? String(p.price) : "",
      selected: true,
    }));
    setPresets(suggested);
  }

  function togglePayment(id: string) {
    set("payment_methods", form.payment_methods.includes(id)
      ? form.payment_methods.filter(m => m !== id)
      : [...form.payment_methods, id]);
  }

  function addCustomPreset() {
    const name = newPresetName.trim();
    if (!name) return;
    setPresets(ps => [...ps, { name, price: "", selected: true }]);
    setNewPresetName("");
  }

  const progress = ((step - 1) / TOTAL_STEPS) * 100;

  async function handleSkip() {
    setSkipping(true);
    try {
      await fetch("/api/setup-wizard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "skip" }) });
    } finally {
      router.push("/app");
    }
  }

  async function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1);
      return;
    }
    setSaving(true);
    try {
      await fetch("/api/setup-wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          business_name: form.business_name,
          owner_name: form.owner_name,
          trade: form.trade,
          phone: form.phone,
          city: form.city,
          state: form.state,
          service_area: form.service_area,
          presets: presets.filter(p => p.selected).map(p => ({ name: p.name, price: parseFloat(p.price) || 0 })),
          payment_methods: form.payment_methods,
          payment_instructions: form.payment_instructions,
        }),
      });
      setStep(6);
    } finally {
      setSaving(false);
    }
  }

  const canNext = useCallback(() => {
    if (step === 1) return form.business_name.trim().length > 0;
    if (step === 2) return form.trade.length > 0;
    if (step === 3) return form.phone.trim().length > 0 || form.city.trim().length > 0;
    return true;
  }, [step, form]);

  if (step === 6) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-sm max-w-sm w-full p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5 text-4xl">
            🎉
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re all set!</h2>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            Your account is ready to go. Start by adding a customer or creating your first quote.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/app/customers")}
              className="w-full py-3 rounded-xl text-white text-sm font-bold"
              style={{ backgroundColor: "#1B3A6B" }}
            >
              Add Your First Customer →
            </button>
            <button
              onClick={() => router.push("/app")}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-50"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{ backgroundColor: "#1B3A6B" }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-white font-bold text-base">TradeBase Setup</span>
          <button
            onClick={handleSkip}
            disabled={skipping}
            className="text-blue-200 text-sm font-medium"
          >
            {skipping ? "…" : "Skip for now"}
          </button>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-blue-200 text-xs">Step {step} of {TOTAL_STEPS}</span>
          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">

        {/* Step 1: Business Name & Owner */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome 👋</h2>
              <p className="text-sm text-gray-500">Let&apos;s get your account set up in under 2 minutes.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
              <div>
                <label className={labelCls}>Business Name *</label>
                <input
                  value={form.business_name}
                  onChange={e => set("business_name", e.target.value)}
                  placeholder="e.g. Sullivan Roofing LLC"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div>
                <label className={labelCls}>Your Name</label>
                <input
                  value={form.owner_name}
                  onChange={e => set("owner_name", e.target.value)}
                  placeholder="e.g. Mike Sullivan"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Trade */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Trade</h2>
              <p className="text-sm text-gray-500">What kind of work do you do? This personalizes your service presets.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {TRADES.map(t => {
                const active = form.trade === t.label;
                return (
                  <button
                    key={t.label}
                    onClick={() => selectTrade(t.label)}
                    className="flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 text-center transition-all"
                    style={{
                      borderColor: active ? "#1B3A6B" : "#E5E7EB",
                      backgroundColor: active ? "#EFF3FA" : "white",
                    }}
                  >
                    <span className="text-2xl">{t.emoji}</span>
                    <span className="text-[11px] font-semibold leading-tight" style={{ color: active ? "#1B3A6B" : "#374151" }}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Contact & Location */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Details</h2>
              <p className="text-sm text-gray-500">This shows on your quotes, invoices, and PDFs.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
              <div>
                <label className={labelCls}>Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set("phone", e.target.value)}
                  placeholder="(207) 555-0100"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>City</label>
                  <input
                    value={form.city}
                    onChange={e => set("city", e.target.value)}
                    placeholder="Portland"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input
                    value={form.state}
                    onChange={e => set("state", e.target.value)}
                    placeholder="ME"
                    maxLength={2}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Service Area <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                <input
                  value={form.service_area}
                  onChange={e => set("service_area", e.target.value)}
                  placeholder="e.g. Southern Maine, Portsmouth NH"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Service Presets */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Service Presets</h2>
              <p className="text-sm text-gray-500">
                These show as quick-add chips when building quotes. Select the ones you offer and set your prices.
              </p>
            </div>
            <div className="space-y-2">
              {presets.map((p, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl shadow-sm flex items-center gap-3 px-4 py-3 border-2 transition-all"
                  style={{ borderColor: p.selected ? "#1B3A6B" : "#F3F4F6" }}
                >
                  <button
                    onClick={() => setPresets(ps => ps.map((x, j) => j === i ? { ...x, selected: !x.selected } : x))}
                    className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0"
                    style={{
                      borderColor: p.selected ? "#1B3A6B" : "#D1D5DB",
                      backgroundColor: p.selected ? "#1B3A6B" : "white",
                    }}
                  >
                    {p.selected && <svg viewBox="0 0 12 10" className="w-3 h-2.5" fill="none"><path d="M1 5l3 3 7-7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>
                  <span className="flex-1 text-sm font-medium text-gray-800">{p.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">$</span>
                    <input
                      type="number"
                      value={p.price}
                      onChange={e => setPresets(ps => ps.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                      placeholder="0"
                      className="w-20 text-right text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustomPreset()}
                placeholder="Add custom service…"
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
              <button
                onClick={addCustomPreset}
                disabled={!newPresetName.trim()}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                Add
              </button>
            </div>
            <p className="text-[11px] text-gray-400 text-center">You can add and edit presets anytime in Settings.</p>
          </div>
        )}

        {/* Step 5: Payment Methods */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">How You Get Paid</h2>
              <p className="text-sm text-gray-500">Select all the ways customers can pay you. This shows on your invoices.</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map(m => {
                const active = form.payment_methods.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => togglePayment(m.id)}
                    className="py-2.5 px-1 rounded-xl border-2 text-center text-xs font-bold transition-all"
                    style={{
                      borderColor: active ? "#1B3A6B" : "#E5E7EB",
                      backgroundColor: active ? "#EFF3FA" : "white",
                      color: active ? "#1B3A6B" : "#6B7280",
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <label className={labelCls}>Payment Instructions <span className="font-normal normal-case text-gray-400">(optional)</span></label>
              <textarea
                rows={3}
                value={form.payment_instructions}
                onChange={e => set("payment_instructions", e.target.value)}
                placeholder="e.g. Zelle payments to (207) 555-0100 or check payable to Sullivan Roofing LLC. Payment due upon completion."
                className={`${inputCls} resize-none`}
              />
              <p className="text-[11px] text-gray-400 mt-1.5">Printed at the bottom of every invoice you send.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="px-4 pb-8 pt-3 bg-white border-t border-gray-100 space-y-3">
        <button
          onClick={handleNext}
          disabled={!canNext() || saving}
          className="w-full py-3.5 rounded-xl text-white text-sm font-bold shadow-sm disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: "#1B3A6B" }}
        >
          {saving ? "Saving…" : step === TOTAL_STEPS ? "Finish Setup →" : "Next →"}
        </button>
        {step > 1 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="w-full py-2 text-sm font-medium text-gray-500"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
