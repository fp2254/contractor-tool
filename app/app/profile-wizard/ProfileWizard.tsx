"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type ServiceItem = { name: string; description: string };

type Form = {
  selected_template: string;
  tagline: string;
  urgency_line: string;
  phone: string;
  service_area: string;
  years_experience: string;
  services: ServiceItem[];
  license_text: string;
  about_text: string;
  slug: string;
};

const EMPTY: Form = {
  selected_template: "classic",
  tagline: "",
  urgency_line: "",
  phone: "",
  service_area: "",
  years_experience: "",
  services: [{ name: "", description: "" }],
  license_text: "",
  about_text: "",
  slug: "",
};

const TEMPLATES = [
  { id: "classic", name: "Classic",      desc: "Trust-focused, traditional",   colors: ["#0f1f3d", "#f5a623"] },
  { id: "modern",  name: "Modern Pro",   desc: "Sleek dark + bold stats",       colors: ["#0d1117", "#58a6ff"] },
  { id: "trust",   name: "Trust Builder",desc: "Services, reviews, gallery",    colors: ["#0f172a", "#f59e0b"] },
  { id: "",        name: "Default",      desc: "Mobile-first dark",             colors: ["#0a0a0a", "#ff5b1f"] },
] as const;

const TOTAL = 4;
const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";
const inputCls = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white";

function slugify(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60);
}

export default function ProfileWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ slug: string } | null>(null);

  const progress = ((step - 1) / TOTAL) * 100;

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  useEffect(() => {
    fetch("/api/profile/public-profile")
      .then(r => r.json())
      .then(({ profile, businessName, primaryPhone }) => {
        if (profile) {
          const svcs: ServiceItem[] = (profile.services ?? []).map((s: unknown) => {
            if (typeof s === "string") return { name: s, description: "" };
            const o = s as Record<string, string>;
            return { name: o.name ?? "", description: o.description ?? "" };
          });
          setForm({
            selected_template: profile.selected_template ?? "classic",
            tagline: profile.tagline ?? "",
            urgency_line: profile.urgency_line ?? "",
            phone: profile.phone ?? primaryPhone ?? "",
            service_area: profile.service_area ?? "",
            years_experience: profile.years_experience ? String(profile.years_experience) : "",
            services: svcs.length > 0 ? svcs : [{ name: "", description: "" }],
            license_text: profile.license_text ?? "",
            about_text: (profile.about_bullets ?? []).join("\n"),
            slug: profile.slug ?? slugify(businessName ?? ""),
          });
        } else {
          setForm(f => ({
            ...f,
            phone: primaryPhone ?? "",
            slug: slugify(businessName ?? ""),
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(publish: boolean) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile/public-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          years_experience: parseInt(form.years_experience) || 0,
          services: form.services.filter(s => s.name.trim()),
        }),
      });
      const json = await res.json() as { profile?: { slug: string }; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Save failed");

      const savedSlug = json.profile?.slug ?? form.slug;

      if (publish) {
        setPublishing(true);
        await fetch("/api/profile/public-profile/publish", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_published: true }),
        });
        setPublishing(false);
      }

      setDone({ slug: savedSlug });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed — please try again.");
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-sm max-w-sm w-full p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5 text-4xl">🌐</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your page is live!</h2>
          <p className="text-sm text-gray-500 mb-2 leading-relaxed">
            Customers can find and contact you at:
          </p>
          <div className="bg-gray-50 rounded-xl px-4 py-3 mb-6 text-sm font-mono text-blue-700 break-all">
            tradebase.contractors/pro/{done.slug}
          </div>
          <div className="space-y-3">
            <a
              href={`/pro/${done.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 rounded-xl text-white text-sm font-bold text-center"
              style={{ backgroundColor: "#1B3A6B" }}
            >
              View My Page →
            </a>
            <button
              onClick={() => router.push("/app/profile/public-profile")}
              className="block w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-50"
            >
              Fine-tune in Full Editor
            </button>
            <button
              onClick={() => router.push("/app")}
              className="block w-full py-2 text-sm text-gray-400"
            >
              Back to Dashboard
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
          <span className="text-white font-bold text-base">Profile Setup</span>
          <button onClick={() => router.back()} className="text-blue-200 text-sm font-medium">
            Exit
          </button>
        </div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-blue-200 text-xs">Step {step} of {TOTAL}</span>
          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">

        {/* ── Step 1: Template ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Pick your look</h2>
              <p className="text-sm text-gray-500">Choose a style for your public lead page — you can change it anytime.</p>
            </div>
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
                    {/* Color swatch */}
                    <div
                      className="h-16 flex items-center justify-center gap-2"
                      style={{ background: `linear-gradient(135deg, ${t.colors[0]} 0%, ${t.colors[1]} 100%)` }}
                    >
                      <div className="w-6 h-6 rounded-full bg-white/20" />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.colors[1] }} />
                    </div>
                    <div className="bg-white px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-800">{t.name}</p>
                        {active && (
                          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "#1B3A6B" }}>
                            <svg viewBox="0 0 12 10" className="w-2.5 h-2" fill="none"><path d="M1 5l3 3 7-7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{t.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 2: Pitch ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Your pitch</h2>
              <p className="text-sm text-gray-500">This is what customers read first — make it count.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
              <div>
                <label className={labelCls}>Headline</label>
                <input
                  value={form.tagline}
                  onChange={e => set("tagline", e.target.value)}
                  placeholder="e.g. Maine's most trusted roofer — 20 yrs, fully licensed"
                  className={inputCls}
                  autoFocus
                />
                <p className="text-[11px] text-gray-400 mt-1">One powerful line about who you are and why customers should call you.</p>
              </div>
              <div>
                <label className={labelCls}>Availability</label>
                <input
                  value={form.urgency_line}
                  onChange={e => set("urgency_line", e.target.value)}
                  placeholder="e.g. Booking 2–3 days out — call to claim your spot"
                  className={inputCls}
                />
                <p className="text-[11px] text-gray-400 mt-1">Creates urgency and sets expectations.</p>
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
              <div>
                <label className={labelCls}>Service Area</label>
                <input
                  value={form.service_area}
                  onChange={e => set("service_area", e.target.value)}
                  placeholder="e.g. Southern Maine, Portsmouth NH"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Years in Business</label>
                <input
                  type="number"
                  value={form.years_experience}
                  onChange={e => set("years_experience", e.target.value)}
                  placeholder="e.g. 12"
                  min={0}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Services ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">What you offer</h2>
              <p className="text-sm text-gray-500">List your main services — customers will see these on your page.</p>
            </div>

            <div className="space-y-3">
              {form.services.map((s, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Service {i + 1}</span>
                    {form.services.length > 1 && (
                      <button
                        onClick={() => set("services", form.services.filter((_, j) => j !== i))}
                        className="text-xs text-red-400 font-semibold"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Name</label>
                    <input
                      value={s.name}
                      onChange={e => set("services", form.services.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      placeholder="e.g. Roof Replacement"
                      className={inputCls}
                      autoFocus={i === form.services.length - 1}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Short description <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                    <input
                      value={s.description}
                      onChange={e => set("services", form.services.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                      placeholder="e.g. Full tear-off and re-roof, all materials included"
                      className={inputCls}
                    />
                  </div>
                </div>
              ))}
            </div>

            {form.services.length < 8 && (
              <button
                onClick={() => set("services", [...form.services, { name: "", description: "" }])}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 active:bg-gray-50"
              >
                + Add another service
              </button>
            )}

            <div className="bg-white rounded-2xl shadow-sm p-4">
              <label className={labelCls}>License / Cert <span className="font-normal normal-case text-gray-400">(optional)</span></label>
              <input
                value={form.license_text}
                onChange={e => set("license_text", e.target.value)}
                placeholder="e.g. ME License #CR-123456, Fully Insured"
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* ── Step 4: Go Live ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Go live</h2>
              <p className="text-sm text-gray-500">Finish your profile and publish it — customers can find you immediately.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
              <div>
                <label className={labelCls}>About you <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                <textarea
                  rows={4}
                  value={form.about_text}
                  onChange={e => set("about_text", e.target.value)}
                  placeholder={"One line per bullet, e.g.:\nOwner-operated since 2005\nAll jobs supervised by me personally\nFree estimates — no pressure"}
                  className={`${inputCls} resize-none`}
                />
                <p className="text-[11px] text-gray-400 mt-1">Each line becomes a bullet point on your page.</p>
              </div>
              <div>
                <label className={labelCls}>Your page URL</label>
                <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-100">
                  <span className="px-3 py-2.5 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 shrink-0 whitespace-nowrap">
                    /pro/
                  </span>
                  <input
                    value={form.slug}
                    onChange={e => set("slug", slugify(e.target.value))}
                    placeholder="your-business-name"
                    className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Full URL: <span className="font-mono text-blue-600">tradebase.contractors/pro/{form.slug || "your-slug"}</span>
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-medium">
                ⚠️ {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => handleSave(true)}
                disabled={saving || publishing}
                className="w-full py-3.5 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                {saving || publishing ? "Publishing…" : "Publish My Page →"}
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-white border border-gray-200 disabled:opacity-50"
              >
                Save as Draft
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Footer nav */}
      {step < 4 && (
        <div className="px-4 pb-8 pt-3 bg-white border-t border-gray-100 space-y-3">
          <button
            onClick={() => setStep(s => s + 1)}
            className="w-full py-3.5 rounded-xl text-white text-sm font-bold shadow-sm"
            style={{ backgroundColor: "#1B3A6B" }}
          >
            Next →
          </button>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="w-full py-2 text-sm font-medium text-gray-500">
              ← Back
            </button>
          )}
        </div>
      )}
      {step === 4 && step > 1 && (
        <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-100">
          <button onClick={() => setStep(s => s - 1)} className="w-full py-2 text-sm font-medium text-gray-500">
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
