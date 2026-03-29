"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const inputCls = "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white";
const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";
const sectionCls = "bg-white rounded-2xl shadow-sm overflow-hidden";

type Profile = {
  slug: string;
  is_published: boolean;
  trade: string;
  tagline: string;
  phone: string;
  service_area: string;
  urgency_line: string;
  years_experience: number;
  revenue_display: string;
  services: string[];
  about_bullets: string[];
  license_text: string;
};

const EMPTY: Profile = {
  slug: "",
  is_published: false,
  trade: "",
  tagline: "",
  phone: "",
  service_area: "",
  urgency_line: "",
  years_experience: 0,
  revenue_display: "",
  services: [],
  about_bullets: ["", "", "", ""],
  license_text: "",
};

const BASE_URL = "https://tradebase.contractors/pro";

function SectionHead({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3.5 border-b border-gray-100">
      <span className="text-lg">{emoji}</span>
      <span className="font-semibold text-slate-800 text-sm">{title}</span>
    </div>
  );
}

export function PublicProfileEditor() {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [servicesText, setServicesText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/profile/public-profile")
      .then((r) => r.json())
      .then((j) => {
        if (j.profile) {
          setProfile(j.profile);
          setServicesText((j.profile.services ?? []).join(", "));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
    setSaveStatus("idle");
  }

  function setBullet(i: number, text: string) {
    const next = [...(profile.about_bullets ?? ["", "", "", ""])];
    next[i] = text;
    set("about_bullets", next);
  }

  async function handleSave() {
    setSaving(true);
    setSaveStatus("idle");
    setSaveError("");
    const services = servicesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/profile/public-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, services }),
      });
      const j = await res.json();
      if (!res.ok) {
        setSaveError(j.error ?? "Failed to save");
        setSaveStatus("error");
      } else {
        setProfile(j.profile);
        setServicesText((j.profile.services ?? []).join(", "));
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
    setPublishing(true);
    try {
      const res = await fetch("/api/profile/public-profile/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !profile.is_published }),
      });
      const j = await res.json();
      if (res.ok) {
        setProfile((p) => ({ ...p, is_published: j.is_published }));
      } else {
        alert(j.error ?? "Failed to toggle. Save your profile first.");
      }
    } catch {
      alert("Network error — please try again");
    } finally {
      setPublishing(false);
    }
  }

  function copyLink() {
    const url = `${BASE_URL}/${profile.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const publicUrl = profile.slug ? `${BASE_URL}/${profile.slug}` : null;
  const bullets = profile.about_bullets?.length ? profile.about_bullets : ["", "", "", ""];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="inline-block h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── Status Card ── */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${profile.is_published ? "bg-green-500" : "bg-gray-300"}`}
            />
            <span className={`text-sm font-bold ${profile.is_published ? "text-green-700" : "text-gray-500"}`}>
              {profile.is_published ? "Live" : "Unpublished"}
            </span>
          </div>
          <button
            onClick={handlePublishToggle}
            disabled={publishing || !profile.slug}
            className="text-xs font-bold px-4 py-1.5 rounded-lg border transition-colors"
            style={
              profile.is_published
                ? { borderColor: "#FCA5A5", color: "#DC2626", background: "#FEF2F2" }
                : { borderColor: "#1B3A6B", color: "#1B3A6B", background: "#EFF6FF" }
            }
          >
            {publishing ? "…" : profile.is_published ? "Unpublish" : "Publish"}
          </button>
        </div>

        {publicUrl ? (
          <>
            <p className="text-xs text-gray-400 break-all">{publicUrl}</p>
            <div className="flex gap-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-xs font-semibold rounded-xl py-2.5 border border-gray-200 text-slate-700 bg-gray-50"
              >
                View Page ↗
              </a>
              <button
                onClick={copyLink}
                className="flex-1 text-xs font-semibold rounded-xl py-2.5 border transition-colors"
                style={
                  copied
                    ? { borderColor: "#22C55E", color: "#16A34A", background: "#F0FDF4" }
                    : { borderColor: "#E5E7EB", color: "#374151", background: "#F9FAFB" }
                }
              >
                {copied ? "✓ Copied!" : "Copy Link"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-400">Fill in the fields below and save to get your public URL.</p>
        )}

        {!profile.slug && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            Save your profile first to generate a public URL.
          </p>
        )}
      </div>

      {/* ── Profile Identity ── */}
      <div className={sectionCls}>
        <SectionHead emoji="✏️" title="Profile Basics" />
        <div className="px-4 pb-4 pt-3 space-y-3">
          <div>
            <label className={labelCls}>Trade / Specialty</label>
            <input
              value={profile.trade}
              onChange={(e) => set("trade", e.target.value)}
              placeholder="e.g. Roofing & Exteriors"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Tagline</label>
            <input
              value={profile.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="e.g. Fast, reliable roofing — free quotes same day"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Public Contact Phone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(503) 555-0192"
              className={inputCls}
            />
            <p className="text-[11px] text-gray-400 mt-1">Shown on your public page — tap-to-call for visitors.</p>
          </div>
          <div>
            <label className={labelCls}>Service Area</label>
            <input
              value={profile.service_area}
              onChange={(e) => set("service_area", e.target.value)}
              placeholder="e.g. Portland metro & surrounding areas"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Urgency / Availability Line</label>
            <input
              value={profile.urgency_line}
              onChange={(e) => set("urgency_line", e.target.value)}
              placeholder="e.g. Booking 2–3 days out — limited availability"
              className={inputCls}
            />
            <p className="text-[11px] text-gray-400 mt-1">Shown under the quote button to drive action.</p>
          </div>
        </div>
      </div>

      {/* ── Services ── */}
      <div className={sectionCls}>
        <SectionHead emoji="⚡" title="Services" />
        <div className="px-4 pb-4 pt-3">
          <label className={labelCls}>Services (comma-separated)</label>
          <textarea
            value={servicesText}
            onChange={(e) => setServicesText(e.target.value)}
            rows={3}
            placeholder="Roof Replacement, Roof Repair, Gutters, Siding, Skylights"
            className={inputCls}
          />
          <p className="text-[11px] text-gray-400 mt-1">Each service becomes a tag on your public profile.</p>
        </div>
      </div>

      {/* ── About ── */}
      <div className={sectionCls}>
        <SectionHead emoji="👤" title="Your Story" />
        <div className="px-4 pb-4 pt-3 space-y-2">
          <p className="text-xs text-gray-400 mb-2">
            Up to 4 bullet points. Lead with an emoji for best results — e.g. &ldquo;🔨 8 years experience in residential roofing&rdquo;
          </p>
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              value={bullets[i] ?? ""}
              onChange={(e) => setBullet(i, e.target.value)}
              placeholder={
                [
                  "🔨 Years of experience...",
                  "👤 Owner-operated — I'm on every job",
                  "🛡️ Licensed & insured · License #",
                  "📍 Serving [your area]",
                ][i]
              }
              className={inputCls}
            />
          ))}
        </div>
      </div>

      {/* ── Credentials & Stats ── */}
      <div className={sectionCls}>
        <SectionHead emoji="🛡️" title="Credentials & Stats" />
        <div className="px-4 pb-4 pt-3 space-y-3">
          <div>
            <label className={labelCls}>License / Cert Text</label>
            <input
              value={profile.license_text}
              onChange={(e) => set("license_text", e.target.value)}
              placeholder="e.g. Licensed & insured · OR #CCB-187432"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Years in Business</label>
              <input
                type="number"
                min={0}
                value={profile.years_experience || ""}
                onChange={(e) => set("years_experience", Number(e.target.value))}
                placeholder="8"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Revenue Display</label>
              <input
                value={profile.revenue_display}
                onChange={(e) => set("revenue_display", e.target.value)}
                placeholder="e.g. $380K"
                className={inputCls}
              />
              <p className="text-[10px] text-gray-400 mt-1">Shown on your stats bar.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── URL Slug ── */}
      <div className={sectionCls}>
        <SectionHead emoji="🔗" title="Your Public URL" />
        <div className="px-4 pb-4 pt-3">
          <label className={labelCls}>URL Slug</label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 shrink-0">/pro/</span>
            <input
              value={profile.slug}
              onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-"))}
              placeholder="mike-sullivan-roofing"
              className={inputCls}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Auto-generated on first save. Only lowercase letters, numbers, and dashes.
          </p>
        </div>
      </div>

      {/* ── Save ── */}
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

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl py-3 text-white text-sm font-bold shadow-sm active:opacity-80 transition-opacity"
        style={{ backgroundColor: "#1B3A6B" }}
      >
        {saving ? "Saving…" : "Save Profile"}
      </button>

      <div className="h-4" />
    </div>
  );
}
