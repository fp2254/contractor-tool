"use client";

import { useRef, useState } from "react";

const TYPES = [
  { id: "bug", label: "Report a Bug", emoji: "🐛", desc: "Something isn't working right" },
  { id: "feature", label: "Request a Feature", emoji: "💡", desc: "Suggest something new" },
  { id: "feedback", label: "General Feedback", emoji: "💬", desc: "Share your thoughts" },
] as const;

type TicketType = typeof TYPES[number]["id"];

export default function SupportPage() {
  const [type, setType] = useState<TicketType | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setScreenshotFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setScreenshotPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setScreenshotPreview(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type || !title.trim() || !description.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      let screenshotUrl: string | null = null;
      if (screenshotFile) {
        const fd = new FormData();
        fd.append("file", screenshotFile);
        const uploadRes = await fetch("/api/upload/support", { method: "POST", body: fd });
        if (uploadRes.ok) {
          const json = await uploadRes.json() as { url?: string };
          screenshotUrl = json.url ?? null;
        }
      }
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title: title.trim(), description: description.trim(), screenshot_url: screenshotUrl }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? "Submission failed");
      }
      setDone(true);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Got it. We'll take a look.</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-xs">
          Thanks for reaching out. We review every submission and will follow up if needed.
        </p>
        <button
          onClick={() => { setDone(false); setType(null); setTitle(""); setDescription(""); setScreenshotFile(null); setScreenshotPreview(null); }}
          className="text-sm font-semibold text-[#1B3A6B] underline">
          Submit another
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-28">
      <h1 className="text-xl font-bold text-slate-800">Support</h1>

      {/* Type selector */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
        {TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setType(t.id)}
            className={`w-full flex items-center gap-4 px-4 py-4 text-left transition-colors ${type === t.id ? "bg-blue-50" : "hover:bg-gray-50"}`}>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${type === t.id ? "bg-blue-100" : "bg-gray-100"}`}>
              {t.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${type === t.id ? "text-[#1B3A6B]" : "text-slate-700"}`}>{t.label}</p>
              <p className="text-xs text-gray-400">{t.desc}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${type === t.id ? "border-[#1B3A6B] bg-[#1B3A6B]" : "border-gray-300"}`}>
              {type === t.id && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>
        ))}
      </div>

      {/* Form */}
      {type && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === "bug" ? "e.g. Invoice total is wrong" : type === "feature" ? "e.g. Add recurring invoices" : "e.g. Love the quote builder"}
                required
                maxLength={120}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === "bug" ? "What happened? What did you expect to happen? Steps to reproduce?" : type === "feature" ? "Describe what you'd like and how it would help you." : "Tell us what's on your mind."}
                required
                rows={5}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>

            {/* Screenshot upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Screenshot <span className="font-normal normal-case text-gray-400">(optional)</span></label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              {screenshotPreview ? (
                <div className="relative">
                  <img src={screenshotPreview} alt="Screenshot preview" className="w-full max-h-40 object-cover rounded-xl border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="absolute top-2 right-2 bg-white rounded-full w-6 h-6 flex items-center justify-center text-gray-500 shadow text-xs font-bold border border-gray-200">
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-gray-200 py-4 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors">
                  Tap to attach a screenshot
                </button>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 font-medium px-1">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !title.trim() || !description.trim()}
            className="w-full rounded-2xl py-4 font-semibold text-white text-sm disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: "#1B3A6B" }}>
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </form>
      )}
    </div>
  );
}
