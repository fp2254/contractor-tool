"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import type { RealtorProfile } from "@/lib/realtor";

export default function SettingsClient({ profile }: { profile: RealtorProfile }) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [agencyName, setAgencyName] = useState(profile.agency_name ?? "");
  const [licenseNumber, setLicenseNumber] = useState(profile.license_number ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [serviceArea, setServiceArea] = useState(profile.service_area ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [yearsExperience, setYearsExperience] = useState(profile.years_experience?.toString() ?? "");
  const [homesSold, setHomesSold] = useState(profile.homes_sold?.toString() ?? "");
  const [salesVolume, setSalesVolume] = useState(profile.sales_volume?.toString() ?? "");
  const [isPublished, setIsPublished] = useState(profile.is_published);
  const [slug, setSlug] = useState(profile.slug);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/realtor-photo", { method: "POST", body: formData });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "Upload failed.");
        return;
      }
      setAvatarUrl(json.url);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(publish?: boolean) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/realtor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          agency_name: agencyName,
          license_number: licenseNumber,
          phone,
          bio,
          service_area: serviceArea,
          avatar_url: avatarUrl,
          years_experience: yearsExperience,
          homes_sold: homesSold,
          sales_volume: salesVolume,
          is_published: publish !== undefined ? publish : isPublished,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; slug?: string; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not save your profile.");
        return;
      }
      if (publish !== undefined) setIsPublished(publish);
      if (json.slug) setSlug(json.slug);
      setMessage("Saved.");
    } catch {
      setError("Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  const initials =
    (displayName || "RE")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Profile Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          This information appears on your public realtor profile.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold text-white"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Profile photo</p>
            <p className="text-xs text-gray-400">JPG, PNG, or WEBP</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Full name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Agency / brokerage</label>
            <input
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">License number</label>
            <input
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Service area</label>
            <input
              value={serviceArea}
              onChange={(e) => setServiceArea(e.target.value)}
              placeholder="e.g. Austin, TX"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Years experience</label>
            <input
              type="number"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              placeholder="8"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Homes sold</label>
            <input
              type="number"
              value={homesSold}
              onChange={(e) => setHomesSold(e.target.value)}
              placeholder="127"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Sales volume ($)</label>
            <input
              type="number"
              value={salesVolume}
              onChange={(e) => setSalesVolume(e.target.value)}
              placeholder="34000000"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Tell homeowners and contractors a bit about yourself…"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm resize-none"
          />
        </div>

        {message && <p className="text-sm text-green-600 font-medium">{message}</p>}
        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "#1B3A6B" }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-800">Public Profile</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isPublished && slug
                ? `Live at /agent/${slug}`
                : "Not published — your profile isn't visible to anyone yet."}
            </p>
          </div>
          {isPublished ? (
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="rounded-xl px-4 py-2 text-sm font-semibold border border-gray-200 text-gray-600"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: "#1B3A6B" }}
            >
              Publish
            </button>
          )}
        </div>
        {isPublished && slug && (
          <a
            href={`/agent/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm underline"
            style={{ color: "#1B3A6B" }}
          >
            View public profile ↗
          </a>
        )}
      </div>
    </div>
  );
}
