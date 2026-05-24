"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ServiceItem = { name: string; description: string; photo_url: string };

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
  photos: Array<{ url: string; title: string }>;
  // Preserved from old editor — not shown in UI
  revenue_display: string;
  stat_label: string;
};

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
  revenue_display: "",
  stat_label: "",
};

const TEMPLATES = [
  {
    id: "classic",
    name: "Classic",
    description: "Trust-focused, traditional",
    colors: ["#0f1f3d", "#f5a623"],
  },
  {
    id: "modern",
    name: "Modern Pro",
    description: "Sleek dark + bold stats",
    colors: ["#0d1117", "#58a6ff"],
  },
  {
    id: "trust",
    name: "Trust Builder",
    description: "Services, reviews, gallery",
    colors: ["#0f172a", "#f59e0b"],
  },
  {
    id: "",
    name: "Default",
    description: "Mobile-first dark",
    colors: ["#0a0a0a", "#ff5b1f"],
  },
] as const;

const BASE_URL = "https://tradebase.contractors/pro";

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
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function templatePreviewSlug(id: string) {
    if (id === "classic") return "classic";
    if (id === "modern") return "modern";
    if (id === "trust") return "trust";
    return "default";
  }

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
          })).filter((ph: any) => ph.url),
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
      photos: profile.photos.map((p) => ({ url: p.url, title: p.title })),
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

      {/* ── Status Bar ── */}
      <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${profile.is_published ? "bg-green-500" : "bg-gray-300"}`} />
          <span className={`text-sm font-bold ${profile.is_published ? "text-green-700" : "text-gray-500"}`}>
            {profile.is_published ? "Live" : "Draft"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {publicUrl && (
            <button
              onClick={() => { navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="text-xs font-semibold rounded-lg px-3 py-1.5 border transition-colors"
              style={copied
                ? { borderColor: "#22C55E", color: "#16A34A", background: "#F0FDF4" }
                : { borderColor: "#E5E7EB", color: "#374151", background: "#F9FAFB" }
              }
            >
              {copied ? "✓ Copied!" : "Copy Link"}
            </button>
          )}
          <button
            onClick={handlePublishToggle}
            disabled={publishing || !profile.slug}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors"
            style={
              profile.is_published
                ? { borderColor: "#FCA5A5", color: "#DC2626", background: "#FEF2F2" }
                : { borderColor: "#1B3A6B", color: "#1B3A6B", background: "#EFF6FF" }
            }
          >
            {publishing ? "…" : profile.is_published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

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
                src={previewUrl}
                className="w-full h-full"
                style={{ border: "none" }}
                title="Profile Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Step 1: Template ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1B3A6B] text-white text-xs font-bold flex items-center justify-center">1</span>
          <p className="font-semibold text-slate-800 text-sm">Pick Your Look</p>
        </div>
        <div className="px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => {
              const selected = profile.selected_template === t.id;
              return (
                <div
                  key={t.id}
                  className="rounded-xl border-2 overflow-hidden transition-all"
                  style={{
                    borderColor: selected ? "#1B3A6B" : "#E5E7EB",
                    background: selected ? "#EFF6FF" : "#FAFAFA",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => update("selected_template", t.id)}
                    className="w-full p-3 text-left active:scale-[0.98]"
                  >
                    <div className="flex gap-1.5 mb-2">
                      {t.colors.map((c, i) => (
                        <div key={i} className="w-5 h-5 rounded" style={{ background: c }} />
                      ))}
                    </div>
                    <p className="text-xs font-bold text-slate-800">{t.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t.description}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTemplateId(t.id)}
                    className="w-full border-t py-1.5 text-[10px] font-semibold text-[#1B3A6B] active:bg-blue-100 transition-colors"
                    style={{ borderColor: selected ? "#BFDBFE" : "#F3F4F6", background: selected ? "#DBEAFE" : "#F9FAFB" }}
                  >
                    Preview →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Step 2: About You ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1B3A6B] text-white text-xs font-bold flex items-center justify-center">2</span>
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
        </div>
      </div>

      {/* ── Step 3: Services ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1B3A6B] text-white text-xs font-bold flex items-center justify-center">3</span>
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

      {/* ── Step 4: Photos ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1B3A6B] text-white text-xs font-bold flex items-center justify-center">4</span>
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
              <div className="flex flex-row gap-2 overflow-x-auto pb-1 mb-3">
                {profile.photos.map((ph, i) => (
                  <div key={i} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    <img src={ph.url} alt={ph.title} className="w-full h-full object-cover" />
                    <button
                      onClick={() => update("photos", profile.photos.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white/90 text-red-500 text-[9px] font-bold flex items-center justify-center shadow-sm"
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
                update("photos", [...profile.photos, { url: local, title: "" }]);
                setUploadingGalleryIdx(idx);
                try {
                  const fd = new FormData();
                  fd.append("file", file);
                  const res = await fetch("/api/upload/gallery-photo", { method: "POST", body: fd });
                  const j = await res.json() as { url?: string; error?: string };
                  if (j.url) {
                    const next = [...profile.photos];
                    next[idx] = { url: j.url, title: "" };
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

      {/* ── Step 5: URL ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1B3A6B] text-white text-xs font-bold flex items-center justify-center">5</span>
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

      {/* ── Template Preview Bottom Sheet ── */}
      {previewTemplateId !== null && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.55)" }}>
          {/* Header bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-white shadow-sm flex-shrink-0">
            <p className="text-sm font-bold text-slate-800">
              {TEMPLATES.find(t => t.id === previewTemplateId)?.name ?? "Template"} Preview
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  update("selected_template", previewTemplateId);
                  setPreviewTemplateId(null);
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                Use This
              </button>
              <button
                onClick={() => setPreviewTemplateId(null)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
          {/* Scrollable iframe */}
          <div className="flex-1 overflow-hidden bg-white">
            <iframe
              key={previewTemplateId}
              src={`/pro/preview/${templatePreviewSlug(previewTemplateId)}`}
              className="w-full h-full border-0"
              title="Template preview"
            />
          </div>
        </div>
      )}
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
