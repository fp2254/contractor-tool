"use client";

import { useEffect, useState } from "react";

type Preset = { id: string; name: string; price?: number | null };

type BusinessHours = { days: string[]; open: string; close: string };
type PricingRange = { preset_id: string; label: string; min: string; max: string };
type Faq = { q: string; a: string };

type Config = {
  enabled: boolean;
  auto_reply: boolean;
  ai_schedules: boolean;
  voicemail_only: boolean;
  full_conversation: boolean;
  require_booking_approval: boolean;
  show_pricing: boolean;
  transcribe_voicemail: boolean;
  greeting_name: string;
  tone: "casual" | "professional";
  business_hours: BusinessHours;
  service_area: string;
  disabled_service_ids: string[];
  pricing_ranges: PricingRange[];
  qualifier_questions: string[];
  faqs: Faq[];
  followup_max_attempts: number;
  followup_delay_days: number;
};

const DEFAULTS: Config = {
  enabled: false,
  auto_reply: false,
  ai_schedules: false,
  voicemail_only: false,
  full_conversation: false,
  require_booking_approval: true,
  show_pricing: false,
  transcribe_voicemail: false,
  greeting_name: "",
  tone: "casual",
  business_hours: { days: ["mon", "tue", "wed", "thu", "fri"], open: "07:00", close: "17:00" },
  service_area: "",
  disabled_service_ids: [],
  pricing_ranges: [],
  qualifier_questions: [],
  faqs: [],
  followup_max_attempts: 2,
  followup_delay_days: 3,
};

const DAYS = [
  { id: "mon", label: "Mon" }, { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" }, { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" }, { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

const inputCls = "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white";
const labelCls = "block text-xs font-semibold text-gray-500 uppercase mb-1";

/* ── Toggle switch ───────────────────────────────────────────────── */
function Toggle({ checked, onChange, label, sub }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? "bg-[#1B3A6B]" : "bg-gray-200"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </label>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export function AiAssistantSettings({ presets }: { presets: Preset[] }) {
  const [cfg, setCfg] = useState<Config>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/ai-assistant/config")
      .then(r => r.json())
      .then((data: Partial<Config>) => {
        setCfg({
          ...DEFAULTS,
          ...data,
          business_hours: data.business_hours ?? DEFAULTS.business_hours,
          disabled_service_ids: data.disabled_service_ids ?? [],
          pricing_ranges: data.pricing_ranges ?? [],
          qualifier_questions: data.qualifier_questions ?? [],
          faqs: data.faqs ?? [],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof Config>(key: K, val: Config[K]) {
    setCfg(p => ({ ...p, [key]: val }));
  }

  async function save() {
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch("/api/ai-assistant/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setToast({ ok: true, msg: "AI Assistant settings saved!" });
    } catch (e) {
      setToast({ ok: false, msg: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-blue-600 animate-spin" />
    </div>
  );

  const isServiceEnabled = (id: string) => !cfg.disabled_service_ids.includes(id);
  function toggleService(id: string) {
    const disabled = cfg.disabled_service_ids;
    set("disabled_service_ids", disabled.includes(id) ? disabled.filter(x => x !== id) : [...disabled, id]);
  }

  function getPricing(presetId: string): PricingRange {
    return cfg.pricing_ranges.find(p => p.preset_id === presetId) ?? { preset_id: presetId, label: "", min: "", max: "" };
  }
  function setPricing(presetId: string, field: "min" | "max", val: string) {
    const label = presets.find(p => p.id === presetId)?.name ?? "";
    const existing = cfg.pricing_ranges.filter(p => p.preset_id !== presetId);
    set("pricing_ranges", [...existing, { preset_id: presetId, label, min: field === "min" ? val : getPricing(presetId).min, max: field === "max" ? val : getPricing(presetId).max }]);
  }

  function addFaq() {
    if (cfg.faqs.length >= 10) return;
    set("faqs", [...cfg.faqs, { q: "", a: "" }]);
  }
  function updateFaq(i: number, field: "q" | "a", val: string) {
    set("faqs", cfg.faqs.map((f, j) => j === i ? { ...f, [field]: val } : f));
  }
  function removeFaq(i: number) { set("faqs", cfg.faqs.filter((_, j) => j !== i)); }

  function addQualifier() {
    if (cfg.qualifier_questions.length >= 10) return;
    set("qualifier_questions", [...cfg.qualifier_questions, ""]);
  }
  function updateQualifier(i: number, val: string) {
    set("qualifier_questions", cfg.qualifier_questions.map((q, j) => j === i ? val : q));
  }
  function removeQualifier(i: number) { set("qualifier_questions", cfg.qualifier_questions.filter((_, j) => j !== i)); }

  function toggleDay(day: string) {
    const days = cfg.business_hours.days;
    set("business_hours", {
      ...cfg.business_hours,
      days: days.includes(day) ? days.filter(d => d !== day) : [...days, day],
    });
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${toast.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Master switch ── */}
      <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
        <Toggle
          checked={cfg.enabled}
          onChange={v => set("enabled", v)}
          label="Enable AI Assistant"
          sub="When off, all automated responses are paused. No messages will be sent."
        />
      </div>

      {/* ── Call Handling ── */}
      <div>
        <p className={labelCls}>Call Handling</p>
        <div className="bg-white rounded-2xl px-4 divide-y divide-gray-100 border border-gray-100">
          <Toggle checked={cfg.voicemail_only} onChange={v => set("voicemail_only", v)}
            label="Send calls straight to voicemail"
            sub="Caller hears your voicemail greeting. AI never picks up." />
          <Toggle checked={cfg.transcribe_voicemail} onChange={v => set("transcribe_voicemail", v)}
            label="Auto-transcribe voicemails"
            sub="Voicemails converted to text and attached to the lead record." />
        </div>
      </div>

      {/* ── SMS / Auto-Reply ── */}
      <div>
        <p className={labelCls}>SMS & Auto-Reply</p>
        <div className="bg-white rounded-2xl px-4 divide-y divide-gray-100 border border-gray-100">
          <Toggle checked={cfg.auto_reply} onChange={v => set("auto_reply", v)}
            label="Auto-text new leads within 60 seconds"
            sub="Fires when a new lead comes in via your profile page or homeowner requests." />
          <Toggle checked={cfg.full_conversation} onChange={v => set("full_conversation", v)}
            label="AI carries the full conversation"
            sub="When off, AI sends one opener only — you take it from there." />
        </div>
      </div>

      {/* ── Scheduling ── */}
      <div>
        <p className={labelCls}>Scheduling</p>
        <div className="bg-white rounded-2xl px-4 divide-y divide-gray-100 border border-gray-100">
          <Toggle checked={cfg.ai_schedules} onChange={v => set("ai_schedules", v)}
            label="AI can offer real time slots"
            sub="Pulls open slots from your calendar. Requires business hours configured below." />
          <Toggle checked={cfg.require_booking_approval} onChange={v => set("require_booking_approval", v)}
            label="Require my approval before confirming a booking"
            sub="Booking is flagged 'Pending' until you confirm. Recommended." />
        </div>
      </div>

      {/* ── Pricing ── */}
      <div>
        <p className={labelCls}>Pricing</p>
        <div className="bg-white rounded-2xl px-4 divide-y divide-gray-100 border border-gray-100">
          <Toggle checked={cfg.show_pricing} onChange={v => set("show_pricing", v)}
            label="Show rough price ranges in conversation"
            sub="AI uses the ranges you enter below. Never commits to exact prices." />
        </div>
      </div>

      {/* ── Identity ── */}
      <div className="space-y-3">
        <p className={labelCls}>AI Identity</p>
        <div>
          <label className={labelCls}>Name the AI signs as</label>
          <input type="text" value={cfg.greeting_name} onChange={e => set("greeting_name", e.target.value)}
            placeholder="e.g. Mike from Sullivan Roofing" className={inputCls} />
          <p className="text-xs text-gray-400 mt-1">Leave blank to use your business name.</p>
        </div>
        <div>
          <label className={labelCls}>Tone</label>
          <div className="grid grid-cols-2 gap-2">
            {(["casual", "professional"] as const).map(t => (
              <button key={t} type="button" onClick={() => set("tone", t)}
                className={`rounded-xl py-2.5 text-sm font-semibold border ${cfg.tone === t ? "border-[#1B3A6B] bg-blue-50 text-[#1B3A6B]" : "border-gray-200 bg-white text-gray-500"}`}>
                {t === "casual" ? "Casual (Hey!)" : "Professional (Hello,)"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Business Hours ── */}
      <div className="space-y-3">
        <p className={labelCls}>Business Hours</p>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-2">Days open</p>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map(d => (
                <button key={d.id} type="button" onClick={() => toggleDay(d.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${cfg.business_hours.days.includes(d.id) ? "bg-[#1B3A6B] text-white border-[#1B3A6B]" : "bg-gray-50 text-gray-400 border-gray-200"}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Open</label>
              <input type="time" value={cfg.business_hours.open}
                onChange={e => set("business_hours", { ...cfg.business_hours, open: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Close</label>
              <input type="time" value={cfg.business_hours.close}
                onChange={e => set("business_hours", { ...cfg.business_hours, close: e.target.value })}
                className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-gray-400">Outside these hours, AI replies: "We're open [hours] — I'll follow up first thing."</p>
        </div>
      </div>

      {/* ── Service Area ── */}
      <div>
        <label className={labelCls}>Service Area</label>
        <input type="text" value={cfg.service_area} onChange={e => set("service_area", e.target.value)}
          placeholder="e.g. Greater Phoenix, Maricopa County, 85001–85099"
          className={inputCls} />
        <p className="text-xs text-gray-400 mt-1">If a lead is outside this area, AI politely declines instead of booking them.</p>
      </div>

      {/* ── Service toggles ── */}
      {presets.length > 0 && (
        <div>
          <p className={labelCls}>Services — What AI can book</p>
          <p className="text-xs text-gray-400 mb-2">Turn off a service and the AI won't mention or book it.</p>
          <div className="bg-white rounded-2xl px-4 divide-y divide-gray-100 border border-gray-100">
            {presets.map(preset => (
              <div key={preset.id}>
                <Toggle
                  checked={isServiceEnabled(preset.id)}
                  onChange={() => toggleService(preset.id)}
                  label={preset.name}
                  sub={preset.price ? `$${Number(preset.price).toLocaleString()}` : undefined}
                />
                {cfg.show_pricing && isServiceEnabled(preset.id) && (
                  <div className="grid grid-cols-2 gap-2 pb-3">
                    <div>
                      <label className={labelCls}>Min ($)</label>
                      <input type="number" min={0} value={getPricing(preset.id).min}
                        onChange={e => setPricing(preset.id, "min", e.target.value)}
                        placeholder="e.g. 400" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Max ($)</label>
                      <input type="number" min={0} value={getPricing(preset.id).max}
                        onChange={e => setPricing(preset.id, "max", e.target.value)}
                        placeholder="e.g. 1500" className={inputCls} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Qualifier questions ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className={labelCls}>Qualifier Questions</p>
          <span className="text-xs text-gray-400">{cfg.qualifier_questions.length}/10</span>
        </div>
        <p className="text-xs text-gray-400 mb-2">AI asks these in order before booking. Keep them short and yes/no-friendly.</p>
        <div className="space-y-2">
          {cfg.qualifier_questions.map((q, i) => (
            <div key={i} className="flex gap-2">
              <input type="text" value={q} onChange={e => updateQualifier(i, e.target.value)}
                placeholder={`Question ${i + 1}`} className={`${inputCls} flex-1`} />
              <button type="button" onClick={() => removeQualifier(i)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-400 text-lg shrink-0">×</button>
            </div>
          ))}
        </div>
        {cfg.qualifier_questions.length < 10 && (
          <button type="button" onClick={addQualifier}
            className="mt-2 w-full rounded-xl py-2.5 border border-dashed border-gray-300 text-sm text-gray-400 font-medium">
            + Add Question
          </button>
        )}
      </div>

      {/* ── FAQs ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className={labelCls}>FAQs</p>
          <span className="text-xs text-gray-400">{cfg.faqs.length}/10</span>
        </div>
        <p className="text-xs text-gray-400 mb-2">Common questions with your exact answers. AI quotes these word-for-word.</p>
        <div className="space-y-3">
          {cfg.faqs.map((faq, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 shrink-0">Q{i + 1}</span>
                <input type="text" value={faq.q} onChange={e => updateFaq(i, "q", e.target.value)}
                  placeholder="e.g. Do you offer free estimates?" className={`${inputCls} flex-1 text-xs`} />
                <button type="button" onClick={() => removeFaq(i)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 text-base shrink-0">×</button>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-gray-400 shrink-0 pt-2.5">A</span>
                <textarea value={faq.a} onChange={e => updateFaq(i, "a", e.target.value)}
                  placeholder="e.g. Yes, always — no strings attached."
                  rows={2} className={`${inputCls} flex-1 text-xs resize-none`} />
              </div>
            </div>
          ))}
        </div>
        {cfg.faqs.length < 10 && (
          <button type="button" onClick={addFaq}
            className="mt-2 w-full rounded-xl py-2.5 border border-dashed border-gray-300 text-sm text-gray-400 font-medium">
            + Add FAQ
          </button>
        )}
      </div>

      {/* ── Follow-up cadence ── */}
      <div>
        <p className={labelCls}>Follow-Up Cadence</p>
        <p className="text-xs text-gray-400 mb-2">After initial contact, how many times should the AI follow up with a non-responder?</p>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
          <div>
            <label className={labelCls}>Max follow-up attempts</label>
            <div className="flex gap-2">
              {[1, 2, 3].map(n => (
                <button key={n} type="button" onClick={() => set("followup_max_attempts", n)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-bold border ${cfg.followup_max_attempts === n ? "bg-[#1B3A6B] text-white border-[#1B3A6B]" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Days before first follow-up</label>
            <div className="flex gap-2">
              {[1, 2, 3, 5, 7].map(n => (
                <button key={n} type="button" onClick={() => set("followup_delay_days", n)}
                  className={`flex-1 rounded-xl py-2 text-sm font-bold border ${cfg.followup_delay_days === n ? "bg-[#1B3A6B] text-white border-[#1B3A6B]" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                  {n}d
                </button>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-xs text-amber-700 font-semibold">Rate limiting</p>
            <p className="text-xs text-amber-600 mt-0.5">After {cfg.followup_max_attempts} unanswered follow-up{cfg.followup_max_attempts !== 1 ? "s" : ""}, the AI stops. No spam, ever.</p>
          </div>
        </div>
      </div>

      {/* ── Save ── */}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full rounded-xl py-3 text-white font-bold text-sm disabled:opacity-50"
        style={{ backgroundColor: "#1B3A6B" }}>
        {saving ? "Saving…" : "Save AI Assistant Settings"}
      </button>

      <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-400 space-y-1">
        <p className="font-semibold text-gray-500">What the AI will never do</p>
        <p>• Guess or imply it "thinks" it can do something not in your config</p>
        <p>• Quote exact prices — only ranges you've entered, or a polite defer</p>
        <p>• Answer insurance, permit, or warranty questions — always defers to you</p>
        <p>• Continue texting after STOP or UNSUBSCRIBE</p>
        <p>• Send more than {cfg.followup_max_attempts} follow-up{cfg.followup_max_attempts !== 1 ? "s" : ""} to a non-responder</p>
      </div>
    </div>
  );
}
