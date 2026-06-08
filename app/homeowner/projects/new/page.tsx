"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, Star } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [form, setForm] = useState({
    title: "",
    contractor_name: "",
    description: "",
    cost: "",
    project_date: "",
    review_text: "",
    has_warranty: false,
    has_documentation: false,
    status: "completed",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/homeowner/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, rating: rating || null }),
    });
    if (res.ok) {
      router.push("/homeowner/projects");
    } else {
      setSaving(false);
      alert("Failed to save. Please try again.");
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/homeowner/projects" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Add Project</h1>
          <p className="text-xs text-gray-400">Log a completed or in-progress home improvement</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Project Title *</label>
          <input name="title" value={form.title} onChange={handleChange} required
            placeholder="e.g. New Roof Installation, Kitchen Remodel"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contractor Name</label>
            <input name="contractor_name" value={form.contractor_name} onChange={handleChange}
              placeholder="e.g. Sullivan Roofing"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
            <select name="status" value={form.status} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200">
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cost</label>
            <input name="cost" value={form.cost} onChange={handleChange} type="number" step="0.01"
              placeholder="e.g. 12500"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Completion Date</label>
            <input name="project_date" value={form.project_date} onChange={handleChange} type="date"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={3}
            placeholder="Describe the work done…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
        </div>

        {/* Star rating */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">Rate the Contractor</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <button key={i} type="button"
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(i === rating ? 0 : i)}>
                <Star size={24}
                  fill={(hoverRating || rating) >= i ? "#F59E0B" : "none"}
                  stroke={(hoverRating || rating) >= i ? "#F59E0B" : "#D1D5DB"} />
              </button>
            ))}
            {rating > 0 && <span className="ml-2 text-sm font-bold text-gray-600">{rating}.0</span>}
          </div>
        </div>

        {rating > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Review (optional)</label>
            <textarea name="review_text" value={form.review_text} onChange={handleChange} rows={2}
              placeholder="What did you think of their work?"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
          </div>
        )}

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="has_warranty" checked={form.has_warranty as boolean}
              onChange={handleChange} className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-gray-600">Has warranty</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="has_documentation" checked={form.has_documentation as boolean}
              onChange={handleChange} className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-gray-600">Has documentation</span>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/homeowner/projects"
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 text-center hover:bg-gray-50">
            Cancel
          </Link>
          <button type="submit" disabled={saving || !form.title.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: "#1B3A6B" }}>
            <Plus size={15} />
            {saving ? "Saving…" : "Add Project"}
          </button>
        </div>
      </form>
    </div>
  );
}
