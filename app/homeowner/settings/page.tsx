"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Check, LogOut, ExternalLink } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    location: "",
    is_profile_public: true,
    slug: "",
  });

  useEffect(() => {
    fetch("/api/homeowner/settings")
      .then(r => r.json())
      .then(({ settings }) => {
        if (settings) setForm({
          display_name: settings.display_name ?? "",
          location: settings.location ?? "",
          is_profile_public: settings.is_profile_public ?? true,
          slug: settings.slug ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/homeowner/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const showcaseUrl = form.slug ? `/h/${form.slug}` : null;

  if (loading) return (
    <div className="max-w-2xl mx-auto p-6 flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1B3A6B" }}>
          <Settings size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Settings</h1>
          <p className="text-xs text-gray-400">Manage your account and preferences</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-gray-900">Profile</h2>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Display Name</label>
          <input name="display_name" value={form.display_name} onChange={handleChange}
            placeholder="e.g. John & Sarah Thompson"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Location</label>
          <input name="location" value={form.location} onChange={handleChange}
            placeholder="e.g. Westborough, MA"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          <p className="text-[10px] text-gray-400 mt-1">Shown on your profile — helps contractors see your area</p>
        </div>

        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-700">Public Profile</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Allow contractors to see your property history</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" name="is_profile_public" checked={form.is_profile_public} onChange={handleChange} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-700 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
          style={{ backgroundColor: saved ? "#16A34A" : "#1B3A6B" }}>
          {saved ? <Check size={15} /> : <Save size={15} />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* ── Public Portfolio URL ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="font-bold text-gray-900 mb-1">My Portfolio URL</h2>
          <p className="text-xs text-gray-400">Set a URL for your public showcase page</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Portfolio Slug</label>
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-200">
            <span className="px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 whitespace-nowrap">
              /h/
            </span>
            <input name="slug" value={form.slug} onChange={handleChange}
              placeholder="your-name"
              className="flex-1 px-3 py-2.5 text-sm text-gray-700 outline-none" />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Letters, numbers, and hyphens only — e.g. <code className="bg-gray-100 px-1 rounded">the-thompsons</code></p>
        </div>

        {showcaseUrl && (
          <a href={showcaseUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
            <ExternalLink size={14} />
            View my showcase → {showcaseUrl}
          </a>
        )}

        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
          style={{ backgroundColor: "#1B3A6B" }}>
          <Save size={15} />
          {saving ? "Saving…" : "Save Slug"}
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-gray-900">Account</h2>
        <a href="/auth/logout"
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-semibold transition-colors">
          <LogOut size={15} /> Sign out
        </a>
      </div>
    </div>
  );
}
