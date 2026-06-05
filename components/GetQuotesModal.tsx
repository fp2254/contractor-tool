"use client";

import { useState } from "react";

const SERVICES = [
  "Roofing",
  "Plumbing",
  "Electrical",
  "HVAC / Heating & Cooling",
  "General Contracting / Remodeling",
  "Painting",
  "Concrete & Masonry",
  "Flooring",
  "Landscaping",
  "Windows & Doors",
  "Gutters",
  "Decks & Fencing",
  "Tree Service",
  "Insulation",
  "Solar",
  "Siding",
  "Drywall",
  "Other",
];

const URGENCIES = [
  { value: "flexible", label: "Flexible" },
  { value: "within_month", label: "Within a month" },
  { value: "within_week", label: "Within a week" },
  { value: "asap", label: "ASAP" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  prefilledService?: string;
  prefilledContractor?: string;
};

export default function GetQuotesModal({ open, onClose, prefilledService, prefilledContractor }: Props) {
  const [service, setService] = useState(prefilledService ?? "");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [urgency, setUrgency] = useState("flexible");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [matchedCount, setMatchedCount] = useState(0);
  const [error, setError] = useState("");

  const reset = () => {
    setService(prefilledService ?? "");
    setDescription(""); setName(""); setPhone(""); setEmail("");
    setCity(""); setState(""); setZip(""); setUrgency("flexible");
    setLoading(false); setDone(false); setMatchedCount(0); setError("");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !description.trim() || !name.trim() || (!phone.trim() && !email.trim())) {
      setError("Please fill in service type, job description, your name, and at least one contact method.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/homeowner/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_type: service, description, name, phone, email, city, state, zip, urgency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setMatchedCount(data.matched_org_count ?? 0);
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={handleClose}
        style={{ backdropFilter: "blur(2px)" }}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Get Free Quotes</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {prefilledContractor
                ? `Requesting from ${prefilledContractor}`
                : "We'll match you with local contractors"}
            </p>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-lg font-bold hover:bg-gray-200 transition-colors">
            ✕
          </button>
        </div>

        {/* Drag handle */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-200 rounded-full" />

        <div className="overflow-y-auto" style={{ maxHeight: "calc(92vh - 72px)" }}>
          {done ? (
            <div className="p-8 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">You're all set!</h3>
              <p className="text-gray-600 mb-2">
                {matchedCount > 0
                  ? `${matchedCount} local contractor${matchedCount > 1 ? "s" : ""} will be in touch soon.`
                  : "Your request was submitted. We'll match you with contractors shortly."}
              </p>
              <p className="text-sm text-gray-400 mb-8">Check your phone or email for responses.</p>
              <button
                onClick={handleClose}
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              {/* Service type */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Service Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  required
                >
                  <option value="">Select a service…</option>
                  {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Describe Your Job <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Need a full roof replacement on a 2,000 sq ft ranch home. Shingles are 20+ years old."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  required
                />
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Timeline</label>
                <div className="grid grid-cols-2 gap-2">
                  {URGENCIES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setUrgency(value)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition-all ${
                        urgency === value
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Location</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State (e.g. ME)"
                    maxLength={2}
                    className="border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 uppercase"
                  />
                </div>
                <input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="Zip code"
                  maxLength={10}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>

              {/* Contact */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Your Contact Info <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  required
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                  type="tel"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  type="email"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
                <p className="text-[11px] text-gray-400 mt-1.5">Provide phone, email, or both so contractors can reach you.</p>
              </div>

              {/* Submit */}
              <div className="pt-1 pb-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl font-bold text-white text-sm transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: "#1B3A6B" }}
                >
                  {loading ? "Submitting…" : "Get Free Quotes →"}
                </button>
                <p className="text-[11px] text-gray-400 text-center mt-2">
                  Free to homeowners. No spam. Contractors pay, not you.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
