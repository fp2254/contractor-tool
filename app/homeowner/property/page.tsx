"use client";

import { useState, useEffect } from "react";
import { Home, Save, Check } from "lucide-react";

export default function PropertyPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    property_type: "Single Family Home",
    sq_footage: "",
    lot_size: "",
    year_built: "",
    bedrooms: "",
    bathrooms: "",
    address: "",
    city: "",
    state: "",
  });

  useEffect(() => {
    fetch("/api/homeowner/property")
      .then(r => r.json())
      .then(({ property }) => {
        if (property) {
          setForm({
            property_type: property.property_type ?? "Single Family Home",
            sq_footage: property.sq_footage?.toString() ?? "",
            lot_size: property.lot_size ?? "",
            year_built: property.year_built?.toString() ?? "",
            bedrooms: property.bedrooms?.toString() ?? "",
            bathrooms: property.bathrooms?.toString() ?? "",
            address: property.address ?? "",
            city: property.city ?? "",
            state: property.state ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/homeowner/property", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto p-6 flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1B3A6B" }}>
          <Home size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Property Details</h1>
          <p className="text-xs text-gray-400">Help contractors understand your home</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Property Type</label>
          <select name="property_type" value={form.property_type} onChange={handleChange}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option>Single Family Home</option>
            <option>Townhome</option>
            <option>Condo / Apartment</option>
            <option>Multi-Family</option>
            <option>Mobile Home</option>
            <option>Commercial</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Square Footage</label>
            <input type="number" name="sq_footage" value={form.sq_footage} onChange={handleChange}
              placeholder="e.g. 2100"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lot Size</label>
            <input type="text" name="lot_size" value={form.lot_size} onChange={handleChange}
              placeholder="e.g. 0.25 acres"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Year Built</label>
            <input type="number" name="year_built" value={form.year_built} onChange={handleChange}
              placeholder="e.g. 1995"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Bedrooms</label>
            <input type="number" name="bedrooms" value={form.bedrooms} onChange={handleChange}
              placeholder="e.g. 3"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Bathrooms</label>
            <input type="number" name="bathrooms" value={form.bathrooms} onChange={handleChange}
              step="0.5" placeholder="e.g. 2.5"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>

        <hr className="border-gray-100" />

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Street Address</label>
          <input type="text" name="address" value={form.address} onChange={handleChange}
            placeholder="123 Main St"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">City</label>
            <input type="text" name="city" value={form.city} onChange={handleChange}
              placeholder="e.g. Denver"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">State</label>
            <input type="text" name="state" value={form.state} onChange={handleChange}
              placeholder="e.g. CO"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
          style={{ backgroundColor: saved ? "#16A34A" : "#1B3A6B" }}>
          {saved ? <Check size={15} /> : <Save size={15} />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Property Details"}
        </button>
      </div>
    </div>
  );
}
