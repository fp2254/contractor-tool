"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ServiceItem = { name: string; description: string; photo_url: string };
type CustomBlock = { id: string; icon: string; title: string; body: string };

type SectionsConfig = {
  services?: boolean;
  about?: boolean;
  stats?: boolean;
  certifications?: boolean;
  reviews?: boolean;
  gallery?: boolean;
  serviceAreas?: boolean;
  trustBar?: boolean;
};

type EditorProfile = {
  slug: string;
  is_published: boolean;
  trade: string;
  tagline: string;
  phone: string;
  service_area: string;
  urgency_line: string;
  years_experience: number;
  license_text: string;
  photo_url: string;
  selected_template: string;
  services: ServiceItem[];
  about_text: string; // UI-only: textarea → saved as about_bullets
  photos: Array<{ url: string; title: string; description: string }>;
  trust_highlights: string[];  // hero bullet points + trust bar
  sections_config: SectionsConfig;
  custom_blocks: CustomBlock[];
  // Preserved from old editor — not shown in UI
  revenue_display: string;
  stat_label: string;
};

const SECTION_LABELS: Array<{ key: keyof SectionsConfig; label: string; desc: string }> = [
  { key: "services",      label: "Services",           desc: "Your list of services offered" },
  { key: "about",         label: "About section",      desc: "Your story + owner photo/quote" },
  { key: "stats",         label: "Stats",              desc: "Years, jobs completed, rating" },
  { key: "certifications",label: "Certifications",     desc: "License number + trust items" },
  { key: "reviews",       label: "Reviews",            desc: "Customer reviews (when you have them)" },
  { key: "gallery",       label: "Photo gallery",      desc: "Project photos grid" },
  { key: "serviceAreas",  label: "Service areas",      desc: "List of cities/areas you cover" },
  { key: "trustBar",      label: "Trust bar",          desc: "Icon strip under the hero" },
];

const EMPTY: EditorProfile = {
  slug: "",
  is_published: false,
  trade: "",
  tagline: "",
  phone: "",
  service_area: "",
  urgency_line: "",
  years_experience: 0,
  license_text: "",
  photo_url: "",
  selected_template: "classic",
  services: [],
  about_text: "",
  photos: [],
  trust_highlights: [],
  sections_config: {},
  custom_blocks: [],
  revenue_display: "",
  stat_label: "",
};

const BASE_URL = "https://tradebase.contractors/showcase";

function normalizeServices(raw: unknown[]): ServiceItem[] {
  return raw.map((s) => {
    if (typeof s === "string") return { name: s, description: "", photo_url: "" };
    const obj = s as Partial<ServiceItem>;
    return { name: obj.name ?? "", description: obj.description ?? "", photo_url: obj.photo_url ?? "" };
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PublicProfileEditor() {
  const [profile, setProfile] = useState<EditorProfile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingGalleryIdx, setUploadingGalleryIdx] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [copied, setCopied] = useState(false);
  const [serviceInput, setServiceInput] = useState("");
  const [trustInput, setTrustInput] = useState("");
  const [websiteLeadsCount, setWebsiteLeadsCount] = useState(0);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockDraft, setBlockDraft] = useState({ icon: "", title: "", body: "" });
  const [slugCheck, setSlugCheck] = useState<"idle" | "checking" | "available" | "taken" | "error">("idle");
  const [previewNonce, setPreviewNonce] = useState(0);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  // Debounced slug availability check
  useEffect(() => {
    const slug = profile.slug?.trim();
    if (!slug || slug.length < 3) { setSlugCheck("idle"); return; }
    setSlugCheck("checking");
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
    slugTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile/check-slug?slug=${encodeURIComponent(slug)}`);
        const j = await res.json();
        setSlugCheck(j.available ? "available" : "taken");
      } catch { setSlugCheck("error"); }
    }, 500);
    return () => { if (slugTimerRef.current) clearTimeout(slugTimerRef.current); };
  }, [profile.slug]);

  // Load existing profile + prefilled data from Business Identity
  useEffect(() => {
    fetch("/api/profile/public-profile")
      .then((r) => r.json())
      .then((j) => {
        const p = j.profile ?? {};
        const bizName = j.businessName || j.orgName || "";
        const phone = p.phone || j.primaryPhone || "";
        const area =
          p.service_area || [j.city, j.state].filter(Boolean).join(", ") || "";

        if (typeof j.website_leads_count === "number") {
          setWebsiteLeadsCount(j.website_leads_count);
        }

        setProfile({
          ...EMPTY,
          ...p,
          trade: p.trade || "",
          tagline: p.tagline || "",
          phone,
          service_area: area,
          urgency_line: p.urgency_line || "",
          license_text: p.license_text || "",
          photo_url: p.photo_url || "",
          selected_template: p.selected_template ?? "classic",
          slug: p.slug || "",
          // UI simplifications
          about_text: (p.about_bullets ?? []).join("\n"),
          services: normalizeServices(p.services ?? []),
          photos: (p.photos ?? []).map((ph: any) => ({
            url: ph.url ?? "",
            title: ph.title ?? "",
            description: ph.description ?? "",
          })).filter((ph: any) => ph.url),
          trust_highlights: Array.isArray(p.trust_highlights) ? p.trust_highlights.filter(Boolean) : [],
          sections_config: (p.sections_config && typeof p.sections_config === "object") ? p.sections_config : {},
          custom_blocks: Array.isArray(p.custom_blocks) ? p.custom_blocks : [],
          revenue_display: p.revenue_display ?? "",
          stat_label: p.stat_label ?? "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = useCallback(<K extends keyof EditorProfile>(key: K, value: EditorProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaveStatus("idle");
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveStatus("idle");
    setSaveError("");

    const about_bullets = profile.about_text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      ...profile,
      about_bullets,
      photos: profile.photos.map((p) => ({ url: p.url, title: p.title, description: p.description })),
      trust_highlights: profile.trust_highlights.filter(Boolean),
      sections_config: profile.sections_config,
      custom_blocks: profile.custom_blocks,
      revenue_display: profile.revenue_display,
      stat_label: profile.stat_label,
    };

    try {
      const res = await fetch("/api/profile/public-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) {
        setSaveError(j.error ?? "Failed to save");
        setSaveStatus("error");
      } else {
        setProfile((prev) => ({
          ...prev,
          slug: j.profile?.slug ?? prev.slug,
        }));
        setSaveStatus("saved");
        setPreviewNonce((n) => n + 1);
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch {
      setSaveError("Network error — please try again");
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishToggle() {
    if (!profile.slug) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/profile/public-profile/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !profile.is_published }),
      });
      const j = await res.json();
      if (res.ok) {
        update("is_published", j.is_published);
      }
    } catch {
      /* nothing */
    } finally {
      setPublishing(false);
    }
  }

  function addService() {
    const name = serviceInput.trim().replace(/,+$/, "");
    if (!name) return;
    if (profile.services.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setServiceInput("");
      return;
    }
    update("services", [...profile.services, { name, description: "", photo_url: "" }]);
    setServiceInput("");
  }

  const publicUrl = profile.slug ? `${BASE_URL}/${profile.slug}` : null;
  const previewUrl = profile.slug ? `/pro/${profile.slug}` : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="inline-block h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Your Website Card ── */}
      {profile.is_published && publicUrl ? (
        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: "linear-gradient(135deg, #1B3A6B 0%, #2d5aa0 100%)" }}>
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400 shadow-sm" />
                <span className="text-sm font-bold text-white">Your site is live</span>
              </div>
              <button
                onClick={handlePublishToggle}
                disabled={publishing}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-white/20 text-white/70 hover:text-white transition-colors"
              >
                {publishing ? "…" : "Unpublish"}
              </button>
            </div>

            {/* URL row */}
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5 mb-3">
              <span className="text-white/60 text-xs truncate flex-1">{publicUrl.replace("https://", "")}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2500); }}
                className="shrink-0 text-xs font-bold px-3 py-1 rounded-lg transition-all"
                style={copied
                  ? { background: "#22C55E", color: "white" }
                  : { background: "white", color: "#1B3A6B" }
                }
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>

            {/* Actions row */}
            <div className="flex items-center gap-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl py-2 transition-colors"
              >
                🌐 View My Site
              </a>
              {websiteLeadsCount > 0 ? (
                <a
                  href="/app/leads"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-500/90 hover:bg-green-500 text-white text-xs font-bold rounded-xl py-2 transition-colors"
                >
                  🔔 {websiteLeadsCount} lead{websiteLeadsCount !== 1 ? "s" : ""} so far
                </a>
              ) : (
                <div className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 text-white/50 text-xs rounded-xl py-2">
                  🔔 Waiting for leads
                </div>
              )}
            </div>

            {/* Secondary: contractor profile link */}
            {profile.slug && (
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-white/50">Public profile page</span>
                <a
                  href={`/showcase/${profile.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-white/80 hover:text-white underline underline-offset-2"
                >
                  /showcase/{profile.slug} ↗
                </a>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
              <div>
                <span className="text-sm font-bold text-gray-500">Draft</span>
                <p className="text-xs text-gray-400">Not visible to the public yet</p>
              </div>
            </div>
            <button
              onClick={handlePublishToggle}
              disabled={publishing || !profile.slug}
              className="text-sm font-bold px-4 py-2 rounded-xl text-white transition-colors"
              style={{ backgroundColor: profile.slug ? "#1B3A6B" : "#9CA3AF" }}
            >
              {publishing ? "…" : profile.slug ? "Go Live" : "Save first"}
            </button>
          </div>
          {/* Show the profile URL even in draft mode so contractors can see/share it */}
          {profile.slug && (
            <div className="px-4 py-3 bg-gray-50 flex items-center gap-2">
              <span className="text-xs text-gray-400 truncate flex-1">
                /pro/<span className="font-semibold text-slate-600">{profile.slug}</span>
              </span>
              <button
                onClick={() => {
                  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/pro/${profile.slug}`;
                  navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                }}
                className="shrink-0 text-xs font-bold px-3 py-1 rounded-lg transition-all border"
                style={copied
                  ? { background: "#22C55E", color: "white", borderColor: "#22C55E" }
                  : { background: "white", color: "#1B3A6B", borderColor: "#e5e7eb" }
                }
              >
                {copied ? "✓ Copied" : "Copy Link"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Live Preview ── */}
      {previewUrl && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase">Live Preview</p>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-[#1B3A6B]"
            >
              Open in new tab ↗
            </a>
          </div>
          <div className="p-3">
            <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 320 }}>
              <iframe
                key={previewNonce}
                src={previewNonce > 0 ? `${previewUrl}?v=${previewNonce}` : previewUrl}
                className="w-full h-full"
                style={{ border: "none" }}
                title="Profile Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Step 1: About You ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1B3A6B] text-white text-xs font-bold flex items-center justify-center">1</span>
          <p className="font-semibold text-slate-800 text-sm">Tell People Who You Are</p>
        </div>
        <div className="px-4 py-3 space-y-3">
          <Field label="Trade / Specialty">
            <input
              value={profile.trade}
              onChange={(e) => update("trade", e.target.value)}
              placeholder="e.g. Roofing & Exteriors"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            />
          </Field>

          <Field label="Tagline">
            <input
              value={profile.tagline}
              onChange={(e) => update("tagline", e.target.value)}
              placeholder="e.g. Fast, reliable roofing — free quotes same day"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(503) 555-0192"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </Field>
            <Field label="Service Area">
              <input
                value={profile.service_area}
                onChange={(e) => update("service_area", e.target.value)}
                placeholder="Portland metro"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </Field>
          </div>

          <Field label="Availability (optional)">
            <input
              value={profile.urgency_line}
              onChange={(e) => update("urgency_line", e.target.value)}
              placeholder="e.g. Booking 2–3 days out"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            />
          </Field>

          <Field label="About You">
            <textarea
              value={profile.about_text}
              onChange={(e) => update("about_text", e.target.value)}
              placeholder="Tell customers your story. What makes you different? How long have you been in business?"
              rows={4}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white resize-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">Each line becomes a bullet point on your page.</p>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Years in Business">
              <input
                type="number"
                min={0}
                value={profile.years_experience || ""}
                onChange={(e) => update("years_experience", Number(e.target.value))}
                placeholder="8"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </Field>
            <Field label="License # (optional)">
              <input
                value={profile.license_text}
                onChange={(e) => update("license_text", e.target.value)}
                placeholder="e.g. OR #CCB-187432"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </Field>
          </div>

          {/* ── Your URL slug ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Your Profile URL</label>
            <div className={`flex items-center rounded-xl border overflow-hidden transition-colors ${
              slugCheck === "available" ? "border-green-400" :
              slugCheck === "taken" ? "border-red-400" :
              "border-gray-200"
            }`}>
              <span className="px-3 py-2.5 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 shrink-0 whitespace-nowrap">
                /pro/
              </span>
              <input
                value={profile.slug}
                onChange={(e) => { update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugCheck("checking"); }}
                placeholder="your-business-name"
                className="flex-1 px-3 py-2.5 text-sm outline-none bg-white min-w-0"
              />
              <span className="px-3 shrink-0 text-base">
                {slugCheck === "checking" && <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin align-middle" />}
                {slugCheck === "available" && <span className="text-green-500">✓</span>}
                {slugCheck === "taken" && <span className="text-red-500">✗</span>}
              </span>
            </div>
            <p className="text-[11px] mt-1 leading-tight">
              {slugCheck === "taken" && <span className="text-red-500">That URL is taken — try adding your city or a word.</span>}
              {slugCheck === "available" && <span className="text-green-600">Available! Save to claim it.</span>}
              {(slugCheck === "idle" || slugCheck === "checking") && <span className="text-gray-400">This is the link you share with customers. Keep it short and memorable.</span>}
            </p>
          </div>
        </div>
      </div>

      {/* ── Step 2: Services ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1B3A6B] text-white text-xs font-bold flex items-center justify-center">2</span>
          <p className="font-semibold text-slate-800 text-sm">What Do You Do?</p>
        </div>
        <div className="px-4 py-3 space-y-3">
          {/* Service chips with optional photo */}
          {profile.services.length > 0 && (
            <div className="space-y-2">
              {profile.services.map((svc, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2"
                >
                  {/* Thumbnail or camera button */}
                  <label className="relative flex-shrink-0 cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const local = URL.createObjectURL(file);
                        const next = profile.services.map((s, idx) =>
                          idx === i ? { ...s, photo_url: local } : s
                        );
                        update("services", next);
                        try {
                          const fd = new FormData();
                          fd.append("file", file);
                          fd.append("index", String(i));
                          const res = await fetch("/api/upload/service-image", { method: "POST", body: fd });
                          const j = await res.json() as { url?: string; error?: string };
                          if (j.url) {
                            update("services", profile.services.map((s, idx) =>
                              idx === i ? { ...s, photo_url: j.url! } : s
                            ));
                          }
                        } catch { /* silent */ }
                        (e.target as HTMLInputElement).value = "";
                      }}
                    />
                    {svc.photo_url ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-blue-200 flex-shrink-0">
                        <img src={svc.photo_url} alt={svc.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg border-2 border-dashed border-blue-200 flex items-center justify-center text-blue-300 flex-shrink-0 hover:border-blue-400 hover:text-blue-500 transition-colors">
                        <span className="text-base leading-none">📷</span>
                      </div>
                    )}
                  </label>

                  <span className="flex-1 text-xs font-semibold text-[#1B3A6B] truncate">{svc.name}</span>

                  {svc.photo_url && (
                    <button
                      type="button"
                      onClick={() => update("services", profile.services.map((s, idx) =>
                        idx === i ? { ...s, photo_url: "" } : s
                      ))}
                      className="text-[10px] text-gray-400 hover:text-red-500 leading-none flex-shrink-0"
                      aria-label="Remove photo"
                      title="Remove photo"
                    >
                      🗑
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => update("services", profile.services.filter((_, idx) => idx !== i))}
                    className="text-blue-300 hover:text-red-500 leading-none flex-shrink-0 text-sm"
                    aria-label={`Remove ${svc.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <p className="text-[11px] text-gray-400">Tap 📷 to add an example photo for each service</p>
            </div>
          )}

          <input
            value={serviceInput}
            onChange={(e) => setServiceInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addService();
              }
            }}
            placeholder="Type a service and hit Enter"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          />
          <p className="text-[11px] text-gray-400">Examples: Roofing, Siding, Gutters, Radon Mitigation</p>
        </div>
      </div>

      {/* ── Step 3: Trust Highlights ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1B3A6B] text-white text-xs font-bold flex items-center justify-center">3</span>
          <p className="font-semibold text-slate-800 text-sm">Trust Highlights</p>
        </div>
        <div className="px-4 py-3 space-y-3">
          <p className="text-xs text-gray-500">These appear as bullet points in your hero and as the trust bar strip. Leave empty to skip both.</p>
          {profile.trust_highlights.length > 0 && (
            <div className="space-y-2">
              {profile.trust_highlights.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                  <span className="text-base flex-shrink-0">✓</span>
                  <span className="flex-1 text-xs font-semibold text-[#1B3A6B] truncate">{item}</span>
                  <button
                    type="button"
                    onClick={() => update("trust_highlights", profile.trust_highlights.filter((_, idx) => idx !== i))}
                    className="text-blue-300 hover:text-red-500 leading-none flex-shrink-0 text-sm"
                    aria-label={`Remove ${item}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            value={trustInput}
            onChange={(e) => setTrustInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const val = trustInput.trim();
                if (val && !profile.trust_highlights.includes(val)) {
                  update("trust_highlights", [...profile.trust_highlights, val]);
                }
                setTrustInput("");
              }
            }}
            placeholder="Type a highlight and press Enter"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          />
          <p className="text-[11px] text-gray-400">Examples: Licensed & Insured since 2015 · Free estimates · 5★ rated on Google</p>
        </div>
      </div>

      {/* ── Step 4: Custom Blocks ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1B3A6B] text-white text-xs font-bold flex items-center justify-center">4</span>
          <p className="font-semibold text-slate-800 text-sm">Custom Sections</p>
        </div>
        <div className="px-4 py-3 space-y-3">
          <p className="text-xs text-gray-500">Add your own cards — warranty info, financing, your process, promos, anything. They appear on your site after the About section.</p>

          {/* Existing blocks */}
          {profile.custom_blocks.length > 0 && (
            <div className="space-y-2">
              {profile.custom_blocks.map((block) => (
                <div key={block.id}>
                  {editingBlockId === block.id ? (
                    /* ── Edit form ── */
                    <div className="border border-blue-200 rounded-xl bg-blue-50 p-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          value={blockDraft.icon}
                          onChange={(e) => setBlockDraft((d) => ({ ...d, icon: e.target.value }))}
                          placeholder="🔨"
                          className="w-14 rounded-lg border border-gray-200 px-2 py-2 text-center text-lg outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                          maxLength={4}
                        />
                        <input
                          value={blockDraft.title}
                          onChange={(e) => setBlockDraft((d) => ({ ...d, title: e.target.value }))}
                          placeholder="Block title"
                          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white font-semibold"
                        />
                      </div>
                      <textarea
                        rows={3}
                        value={blockDraft.body}
                        onChange={(e) => setBlockDraft((d) => ({ ...d, body: e.target.value }))}
                        placeholder="Description (optional)"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!blockDraft.title.trim()) return;
                            update("custom_blocks", profile.custom_blocks.map((b) =>
                              b.id === block.id ? { ...b, ...blockDraft } : b
                            ));
                            setEditingBlockId(null);
                          }}
                          className="flex-1 rounded-lg py-1.5 text-xs font-bold text-white"
                          style={{ backgroundColor: "#1B3A6B" }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBlockId(null)}
                          className="flex-1 rounded-lg py-1.5 text-xs font-semibold border border-gray-200 text-gray-600 bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Display row ── */
                    <div className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                      {block.icon && <span className="text-2xl leading-none mt-0.5 shrink-0">{block.icon}</span>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{block.title}</p>
                        {block.body && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{block.body}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => { setBlockDraft({ icon: block.icon, title: block.title, body: block.body }); setEditingBlockId(block.id); }}
                          className="text-xs font-semibold text-[#1B3A6B] px-2 py-1 rounded-lg bg-blue-50 border border-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => update("custom_blocks", profile.custom_blocks.filter((b) => b.id !== block.id))}
                          className="text-xs font-semibold text-red-500 px-2 py-1 rounded-lg bg-red-50 border border-red-100"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new block form */}
          {editingBlockId === "new" ? (
            <div className="border border-blue-200 rounded-xl bg-blue-50 p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  value={blockDraft.icon}
                  onChange={(e) => setBlockDraft((d) => ({ ...d, icon: e.target.value }))}
                  placeholder="🔨"
                  className="w-14 rounded-lg border border-gray-200 px-2 py-2 text-center text-lg outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                  maxLength={4}
                  autoFocus
                />
                <input
                  value={blockDraft.title}
                  onChange={(e) => setBlockDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Section title (e.g. Financing Available)"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white font-semibold"
                />
              </div>
              <textarea
                rows={3}
                value={blockDraft.body}
                onChange={(e) => setBlockDraft((d) => ({ ...d, body: e.target.value }))}
                placeholder="Details (e.g. We offer 0% financing on jobs over $1,000...)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!blockDraft.title.trim()) return;
                    const newBlock: CustomBlock = {
                      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                      icon: blockDraft.icon,
                      title: blockDraft.title.trim(),
                      body: blockDraft.body.trim(),
                    };
                    update("custom_blocks", [...profile.custom_blocks, newBlock]);
                    setBlockDraft({ icon: "", title: "", body: "" });
                    setEditingBlockId(null);
                  }}
                  className="flex-1 rounded-lg py-1.5 text-xs font-bold text-white"
                  style={{ backgroundColor: "#1B3A6B" }}
                >
                  Add Block
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingBlockId(null); setBlockDraft({ icon: "", title: "", body: "" }); }}
                  className="flex-1 rounded-lg py-1.5 text-xs font-semibold border border-gray-200 text-gray-600 bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setBlockDraft({ icon: "", title: "", body: "" }); setEditingBlockId("new"); }}
              className="w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-semibold text-gray-400 hover:border-blue-200 hover:text-blue-500 transition-colors"
            >
              + Add a Section
            </button>
          )}

          {profile.custom_blocks.length > 0 && (
            <p className="text-[11px] text-gray-400">Examples: Financing Available · Our Process · Warranty Info · Current Promotions</p>
          )}
        </div>
      </div>

      {/* ── Step 5: Photos ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1B3A6B] text-white text-xs font-bold flex items-center justify-center">5</span>
          <p className="font-semibold text-slate-800 text-sm">Photos</p>
        </div>
        <div className="px-4 py-3 space-y-4">
          {/* Logo / Headshot */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-100 flex-shrink-0">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl text-gray-300">👤</span>
              )}
            </div>
            <div className="flex-1">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const local = URL.createObjectURL(file);
                  update("photo_url", local);
                  setUploadingPhoto(true);
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    const res = await fetch("/api/upload/profile-photo", { method: "POST", body: fd });
                    const j = await res.json() as { url?: string; error?: string };
                    if (j.url) update("photo_url", j.url);
                    else throw new Error(j.error ?? "Upload failed");
                  } catch (err: any) {
                    update("photo_url", "");
                    alert(err.message ?? "Photo upload failed");
                  } finally {
                    setUploadingPhoto(false);
                    if (photoInputRef.current) photoInputRef.current.value = "";
                  }
                }}
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-full rounded-xl py-2 text-sm font-semibold border border-gray-200 text-slate-700 bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {uploadingPhoto ? "Uploading…" : profile.photo_url ? "Change Logo / Photo" : "Upload Logo or Photo"}
              </button>
              {profile.photo_url && !uploadingPhoto && (
                <button
                  type="button"
                  onClick={() => update("photo_url", "")}
                  className="w-full mt-1.5 rounded-xl py-1.5 text-xs font-semibold text-red-500 border border-red-100 bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Project Gallery */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Project Gallery</p>
            {profile.photos.length > 0 && (
              <div className="space-y-2 mb-3">
                {profile.photos.map((ph, i) => (
                  <div key={i} className="flex gap-3 bg-gray-50 border border-gray-100 rounded-xl p-2">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
                      <img src={ph.url} alt={ph.title} className="w-full h-full object-cover" />
                    </div>
                    {/* Fields */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <input
                        value={ph.title}
                        onChange={(e) => {
                          const next = profile.photos.map((p, idx) =>
                            idx === i ? { ...p, title: e.target.value } : p
                          );
                          update("photos", next);
                        }}
                        placeholder="Title (e.g. Roof replacement — Oak St)"
                        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-100 bg-white"
                      />
                      <textarea
                        rows={2}
                        value={ph.description}
                        onChange={(e) => {
                          const next = profile.photos.map((p, idx) =>
                            idx === i ? { ...p, description: e.target.value } : p
                          );
                          update("photos", next);
                        }}
                        placeholder="Short description (optional)"
                        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-100 bg-white resize-none"
                      />
                    </div>
                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => update("photos", profile.photos.filter((_, idx) => idx !== i))}
                      className="flex-shrink-0 text-red-400 text-sm leading-none self-start mt-0.5"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              id="gallery-upload"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const idx = profile.photos.length;
                const local = URL.createObjectURL(file);
                update("photos", [...profile.photos, { url: local, title: "", description: "" }]);
                setUploadingGalleryIdx(idx);
                try {
                  const fd = new FormData();
                  fd.append("file", file);
                  const res = await fetch("/api/upload/gallery-photo", { method: "POST", body: fd });
                  const j = await res.json() as { url?: string; error?: string };
                  if (j.url) {
                    const next = [...profile.photos];
                    next[idx] = { url: j.url, title: "", description: "" };
                    update("photos", next);
                  } else throw new Error(j.error ?? "Upload failed");
                } catch (err: any) {
                  update("photos", profile.photos.slice(0, -1));
                  alert(err.message ?? "Photo upload failed");
                } finally {
                  setUploadingGalleryIdx(null);
                  (e.target as HTMLInputElement).value = "";
                }
              }}
            />
            <button
              type="button"
              onClick={() => document.getElementById("gallery-upload")?.click()}
              disabled={uploadingGalleryIdx !== null}
              className="w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-semibold text-gray-400 active:border-blue-200 active:text-blue-500 transition-colors disabled:opacity-50"
            >
              {uploadingGalleryIdx !== null ? "Uploading…" : "+ Add Project Photo"}
            </button>
            <p className="text-[11px] text-gray-400 mt-1">Before & after shots, completed jobs, team photos.</p>
          </div>
        </div>
      </div>

      {/* ── Step 6: Sections ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1B3A6B] text-white text-xs font-bold flex items-center justify-center">6</span>
          <p className="font-semibold text-slate-800 text-sm">Sections on Your Page</p>
        </div>
        <div className="px-4 py-3 space-y-1">
          <p className="text-xs text-gray-500 mb-3">Turn off any section you don't want on your public profile. Sections with no content are always hidden automatically.</p>
          {SECTION_LABELS.map(({ key, label, desc }) => {
            const isOn = profile.sections_config[key] !== false;
            return (
              <div
                key={key}
                className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-sm font-semibold text-slate-800">{label}</p>
                  <p className="text-[11px] text-gray-400">{desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    update("sections_config", {
                      ...profile.sections_config,
                      [key]: !isOn,
                    });
                  }}
                  className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none"
                  style={{ backgroundColor: isOn ? "#1B3A6B" : "#D1D5DB" }}
                  aria-label={`Toggle ${label}`}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                    style={{ transform: isOn ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Step 7: URL ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1B3A6B] text-white text-xs font-bold flex items-center justify-center">7</span>
          <p className="font-semibold text-slate-800 text-sm">Your Public URL</p>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 shrink-0">/pro/</span>
            <input
              value={profile.slug}
              onChange={(e) =>
                update(
                  "slug",
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-")
                )
              }
              placeholder="mike-sullivan-roofing"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white flex-1"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Auto-generated from your business name on first save.
          </p>
        </div>
      </div>

      {/* ── Save Feedback ── */}
      {saveStatus === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}
      {saveStatus === "saved" && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-semibold">
          ✓ Profile saved
        </div>
      )}

      {/* ── Save Button ── */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl py-3 text-white text-sm font-bold shadow-sm active:opacity-80 transition-opacity disabled:opacity-60"
        style={{ backgroundColor: "#1B3A6B" }}
      >
        {saving ? "Saving…" : "Save Profile"}
      </button>

      <div className="h-4" />

    </div>
  );
}

// ─── Small helpers ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}
