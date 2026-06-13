"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import PriceSheetScanner from "@/components/PriceSheetScanner";

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

const TOTAL_STEPS = 6;

const TEMPLATES = [
  { id: "classic", name: "Classic",       desc: "Trust-focused, traditional",  colors: ["#0f1f3d", "#f5a623"] as const },
  { id: "modern",  name: "Modern Pro",    desc: "Sleek dark + bold stats",      colors: ["#0d1117", "#58a6ff"] as const },
  { id: "trust",   name: "Trust Builder", desc: "Services, reviews, gallery",   colors: ["#0f172a", "#f59e0b"] as const },
  { id: "",        name: "Default",       desc: "Mobile-first dark",            colors: ["#0a0a0a", "#ff5b1f"] as const },
];

const inputCls = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white";
const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

type CardScanResult = {
  name: string; company: string; phone: string;
  email: string; website: string; address: string; trade: string;
};

function parseAddressParts(raw: string): { city: string; state: string } {
  const m = raw.match(/,\s*([^,]+),\s*([A-Z]{2})\s+\d{5}/i);
  if (m) return { city: m[1].trim(), state: m[2].toUpperCase() };
  const parts = raw.split(",").map(s => s.trim());
  if (parts.length >= 3) {
    const last = parts[parts.length - 1];
    const stateZip = last.match(/([A-Z]{2})\s+\d{5}/i);
    if (stateZip) return { city: parts[parts.length - 2], state: stateZip[1].toUpperCase() };
  }
  return { city: "", state: "" };
}

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

  /* ── Card scan state ── */
  const cardInputRef = useRef<HTMLInputElement>(null);
  const [cardPhase, setCardPhase] = useState<"idle" | "scanning" | "preview" | "error">("idle");
  const [cardResult, setCardResult] = useState<CardScanResult | null>(null);
  const [cardError, setCardError] = useState("");

  async function handleCardFile(file: File) {
    setCardPhase("scanning");
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target!.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    try {
      const res = await fetch("/api/ai/card-scan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_data_url: dataUrl }),
      });
      const json = await res.json() as CardScanResult & { error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Scan failed");
      setCardResult(json);
      setCardPhase("preview");
    } catch (e: unknown) {
      setCardError(e instanceof Error ? e.message : "Card scan failed");
      setCardPhase("error");
    }
  }

  function applyCardResult() {
    if (!cardResult) return;
    setForm(f => {
      const next = { ...f };
      if (cardResult.company) next.business_name = cardResult.company;
      if (cardResult.name)    next.owner_name    = cardResult.name;
      if (cardResult.phone)   next.phone         = cardResult.phone;
      if (cardResult.address) {
        const { city, state } = parseAddressParts(cardResult.address);
        if (city)  next.city  = city;
        if (state) next.state = state;
      }
      return next;
    });
    setCardPhase("idle");
    setCardResult(null);
  }

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
    selected_template: "classic",
    tagline: "",
    urgency_line: "",
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
      await fetch("/api/profile/public-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_template: form.selected_template,
          tagline: form.tagline,
          urgency_line: form.urgency_line,
          phone: form.phone,
          service_area: form.service_area,
        }),
      });
      setStep(7);
    } finally {
      setSaving(false);
    }
  }

  const canNext = useCallback(() => true, []);

  /* ── Step 6: Try Your Form ── */
  const [testName, setTestName] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testDesc, setTestDesc] = useState("");
  const [testPhase, setTestPhase] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [testLeadId, setTestLeadId] = useState<string | null>(null);

  async function handleTestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!testName.trim()) return;
    setTestPhase("submitting");
    try {
      const res = await fetch("/api/leads/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: testName, phone: testPhone, description: testDesc }),
      });
      const json = await res.json() as { ok?: boolean; lead_id?: string; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      setTestLeadId(json.lead_id ?? null);
      setTestPhase("done");
    } catch {
      setTestPhase("error");
    }
  }

  if (step === 7) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-sm max-w-sm w-full p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5 text-4xl">
            🎉
          </div>
          {testLeadId ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">First lead in! 🎉</h2>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Your test request just landed in your Leads pipeline. That&apos;s exactly how it works when a real customer fills out your page.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re all set!</h2>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Your account is ready to go. Start by adding a customer or creating your first quote.
              </p>
            </>
          )}
          <div className="space-y-3">
            {testLeadId && (
              <button
                onClick={() => router.push("/app/leads")}
                className="w-full py-3 rounded-xl text-white text-sm font-bold"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                See My Lead →
              </button>
            )}
            <button
              onClick={() => router.push("/app/customers")}
              className={`w-full py-3 rounded-xl text-sm font-bold ${testLeadId ? "text-gray-700 bg-gray-50 border border-gray-200" : "text-white"}`}
              style={testLeadId ? undefined : { backgroundColor: "#1B3A6B" }}
            >
              Add Your First Customer →
            </button>
            <button
              onClick={() => router.push("/app/profile-wizard")}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200"
            >
              🌐 Finish My Lead Page
            </button>
            <button
              onClick={() => router.push("/app")}
              className="w-full py-2 text-sm font-medium text-gray-400"
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

        {/* Step 1: About Your Business (combined business info + contact) */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome 👋</h2>
              <p className="text-sm text-gray-500">Let&apos;s get your account set up in under 2 minutes.</p>
            </div>

            {/* ── Business card scanner ── */}
            <input
              ref={cardInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleCardFile(f);
                (e.target as HTMLInputElement).value = "";
              }}
            />

            {cardPhase === "idle" && (
              <button
                type="button"
                onClick={() => cardInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border-2 border-dashed border-blue-200 text-sm font-semibold text-blue-600 bg-blue-50 active:bg-blue-100"
              >
                <span className="text-base">🪪</span>
                Autofill from Business Card
              </button>
            )}

            {cardPhase === "scanning" && (
              <div className="flex items-center justify-center gap-3 py-3.5 rounded-xl bg-blue-50 border border-blue-100">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-blue-700">Reading your card…</p>
              </div>
            )}

            {cardPhase === "error" && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-start gap-3">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-700">{cardError || "Scan failed"}</p>
                  <button type="button" onClick={() => { setCardPhase("idle"); cardInputRef.current?.click(); }} className="text-xs text-red-500 underline mt-1">Try again</button>
                </div>
                <button type="button" onClick={() => setCardPhase("idle")} className="text-gray-400 text-xl leading-none">×</button>
              </div>
            )}

            {cardPhase === "preview" && cardResult && (
              <div className="rounded-2xl bg-white border-2 border-blue-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 border-b border-blue-100">
                  <span className="text-base">🪪</span>
                  <p className="text-sm font-semibold text-blue-800 flex-1">Card scanned — tap Apply to fill in your info</p>
                  <button type="button" onClick={() => setCardPhase("idle")} className="text-blue-400 text-xl leading-none">×</button>
                </div>
                <div className="px-4 py-3 space-y-1.5">
                  {[
                    cardResult.company && { label: "Business", value: cardResult.company },
                    cardResult.name    && { label: "Owner",    value: cardResult.name },
                    cardResult.phone   && { label: "Phone",    value: cardResult.phone },
                    cardResult.address && { label: "Location", value: cardResult.address },
                  ].filter(Boolean).map((f) => {
                    const row = f as { label: string; value: string };
                    return (
                      <div key={row.label} className="flex gap-2 text-sm">
                        <span className="text-gray-400 w-16 shrink-0 text-xs font-semibold uppercase pt-0.5">{row.label}</span>
                        <span className="text-gray-800 truncate">{row.value}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 px-4 pb-4">
                  <button
                    type="button"
                    onClick={applyCardResult}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold"
                    style={{ backgroundColor: "#1B3A6B" }}
                  >
                    Apply to Form →
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCardPhase("idle"); cardInputRef.current?.click(); }}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100"
                  >
                    Rescan
                  </button>
                </div>
              </div>
            )}

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

        {/* Step 3: Service Presets */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Service Presets</h2>
              <p className="text-sm text-gray-500">
                These show as quick-add chips when building quotes. Select the ones you offer and set your prices.
              </p>
            </div>

            {/* Price sheet scanner */}
            <PriceSheetScanner
              onScanned={scanned => {
                setPresets(ps => {
                  const existing = new Set(ps.map(p => p.name.toLowerCase()));
                  const newOnes = scanned
                    .filter(s => !existing.has(s.name.toLowerCase()))
                    .map(s => ({ name: s.name, price: String(s.price || ""), selected: true }));
                  return [...ps, ...newOnes];
                });
              }}
            />

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

        {/* Step 5: Lead Page */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Lead Page</h2>
              <p className="text-sm text-gray-500">Set up your public page so customers can find and contact you online.</p>
            </div>

            {/* Template picker */}
            <div>
              <p className={labelCls}>Pick a style</p>
              <div className="grid grid-cols-2 gap-3">
                {TEMPLATES.map(t => {
                  const active = form.selected_template === t.id;
                  return (
                    <button
                      key={t.id || "default"}
                      onClick={() => set("selected_template", t.id)}
                      className="rounded-2xl overflow-hidden border-2 text-left transition-all"
                      style={{ borderColor: active ? "#1B3A6B" : "#E5E7EB" }}
                    >
                      <div
                        className="h-14 flex items-center justify-center gap-2"
                        style={{ background: `linear-gradient(135deg, ${t.colors[0]} 0%, ${t.colors[1]} 100%)` }}
                      >
                        <div className="w-5 h-5 rounded-full bg-white/20" />
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.colors[1] }} />
                      </div>
                      <div className="bg-white px-3 py-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-gray-800">{t.name}</p>
                          {active && (
                            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "#1B3A6B" }}>
                              <svg viewBox="0 0 12 10" className="w-2.5 h-2" fill="none"><path d="M1 5l3 3 7-7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
              <div>
                <label className={labelCls}>Headline <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                <input
                  value={form.tagline}
                  onChange={e => set("tagline", e.target.value)}
                  placeholder="e.g. Maine's most trusted roofer — 20 yrs, fully licensed"
                  className={inputCls}
                />
                <p className="text-[11px] text-gray-400 mt-1">The first line customers see — make it your best pitch.</p>
              </div>
              <div>
                <label className={labelCls}>Availability <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                <input
                  value={form.urgency_line}
                  onChange={e => set("urgency_line", e.target.value)}
                  placeholder="e.g. Booking 2–3 days out — call to claim your spot"
                  className={inputCls}
                />
                <p className="text-[11px] text-gray-400 mt-1">Sets expectations and creates urgency to call you now.</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 text-center">You can add more detail (services, photos, reviews) in the Profile editor anytime.</p>
          </div>
        )}

        {step === 4 && (
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

        {/* Step 6: Try Your Form */}
        {step === 6 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Try your form</h2>
              <p className="text-sm text-gray-500">
                This is what customers see on your page. Fill it out as a test — it creates a real lead in your pipeline so you can see the whole flow.
              </p>
            </div>

            {/* Phone-frame form preview */}
            <div className="rounded-3xl border-4 border-gray-800 bg-gray-800 p-1 shadow-xl mx-auto max-w-xs">
              {/* Phone speaker */}
              <div className="flex justify-center mb-1">
                <div className="w-16 h-1 bg-gray-600 rounded-full" />
              </div>
              <div className="bg-white rounded-2xl overflow-hidden">
                {/* Mini header */}
                <div className="px-4 py-3" style={{ backgroundColor: "#1B3A6B" }}>
                  <p className="text-white font-bold text-sm truncate">
                    {form.business_name || "Your Business"}
                  </p>
                  <p className="text-blue-200 text-xs mt-0.5">
                    {form.tagline || "Get a free quote today"}
                  </p>
                </div>

                {testPhase === "done" ? (
                  <div className="px-4 py-8 text-center">
                    <div className="text-3xl mb-2">✅</div>
                    <p className="font-bold text-gray-900 text-sm mb-1">Request sent!</p>
                    <p className="text-xs text-gray-500">We&apos;ll be in touch shortly.</p>
                  </div>
                ) : (
                  <form onSubmit={handleTestSubmit} className="p-4 space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Your Name *</label>
                      <input
                        required
                        value={testName}
                        onChange={e => setTestName(e.target.value)}
                        placeholder="Jane Smith"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Phone</label>
                      <input
                        type="tel"
                        value={testPhone}
                        onChange={e => setTestPhone(e.target.value)}
                        placeholder="(207) 555-0100"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">What do you need?</label>
                      <textarea
                        rows={2}
                        value={testDesc}
                        onChange={e => setTestDesc(e.target.value)}
                        placeholder="e.g. Roof is leaking above the kitchen…"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                      />
                    </div>
                    {testPhase === "error" && (
                      <p className="text-xs text-red-500 font-medium">Something went wrong — try again.</p>
                    )}
                    <button
                      type="submit"
                      disabled={testPhase === "submitting" || !testName.trim()}
                      className="w-full py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                      style={{ backgroundColor: "#1B3A6B" }}
                    >
                      {testPhase === "submitting" ? "Sending…" : "Request a Quote →"}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {testPhase === "done" ? (
              <div className="rounded-2xl bg-green-50 border border-green-100 px-4 py-4 text-center">
                <p className="font-bold text-green-800 text-sm mb-1">🎉 Your first lead just landed!</p>
                <p className="text-xs text-green-700">Check your Leads pipeline to see it — and that&apos;s exactly how it works when a real customer submits this form.</p>
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 text-center">
                Tip: try pre-filling your own name and a fake job description — it only takes 10 seconds.
              </p>
            )}
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
