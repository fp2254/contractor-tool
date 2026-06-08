"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, TrendingUp } from "lucide-react";

type FutureProject = {
  id: string;
  title: string;
  status: string;
  notes: string | null;
  cover_image_url: string | null;
};

const STATUS_OPTS = [
  { value: "planning", label: "Planning", color: "#3B82F6" },
  { value: "researching", label: "Researching", color: "#8B5CF6" },
  { value: "considering", label: "Considering", color: "#6B7280" },
];

const COVER_IMAGES: Record<string, string> = {
  deck: "https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?w=200&h=130&fit=crop",
  bathroom: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=200&h=130&fit=crop",
  kitchen: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=130&fit=crop",
  roof: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=130&fit=crop",
  fence: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=130&fit=crop",
  landscaping: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=130&fit=crop",
  basement: "https://images.unsplash.com/photo-1565117447851-6cfa4b27c9a5?w=200&h=130&fit=crop",
};

function getAutoImage(title: string) {
  const t = title.toLowerCase();
  for (const [key, url] of Object.entries(COVER_IMAGES)) {
    if (t.includes(key)) return url;
  }
  return null;
}

export default function FuturePage() {
  const [items, setItems] = useState<FutureProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("planning");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/homeowner/future")
      .then(r => r.json())
      .then(({ items }) => setItems(items ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/homeowner/future", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, status, notes, cover_image_url: getAutoImage(title) }),
    });
    const { item } = await res.json();
    if (item) setItems(prev => [...prev, item]);
    setTitle(""); setNotes(""); setStatus("planning"); setAdding(false);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this future project?")) return;
    setDeleting(id);
    await fetch("/api/homeowner/future", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems(prev => prev.filter(x => x.id !== id));
    setDeleting(null);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Future Projects</h1>
          <p className="text-xs text-gray-400">Projects you&apos;re planning or considering</p>
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white"
          style={{ backgroundColor: "#1B3A6B" }}>
          <Plus size={14} /> Add Project
        </button>
      </div>

      {adding && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-blue-100 space-y-4">
          <h3 className="font-bold text-gray-900">New Future Project</h3>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Project Name *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
              placeholder="e.g. New Deck, Bathroom Remodel"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
            <div className="flex gap-2">
              {STATUS_OPTS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-colors"
                  style={status === opt.value
                    ? { backgroundColor: opt.color + "15", borderColor: opt.color, color: opt.color }
                    : { borderColor: "#E5E7EB", color: "#6B7280" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Budget ideas, timeline, things to consider…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setAdding(false); setTitle(""); setNotes(""); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleAdd} disabled={!title.trim() || saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: "#1B3A6B" }}>
              {saving ? "Saving…" : "Add Project"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : items.length === 0 && !adding ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
          <p className="text-5xl mb-4">🚧</p>
          <h2 className="text-lg font-bold text-gray-800 mb-1">No future projects yet</h2>
          <p className="text-sm text-gray-400 mb-5">Plan ahead — add projects you&apos;re considering and get estimates from contractors.</p>
          <button onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: "#1B3A6B" }}>
            <Plus size={15} /> Add First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(item => {
            const st = STATUS_OPTS.find(s => s.value === item.status);
            return (
              <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm group">
                <div className="aspect-video relative overflow-hidden bg-gray-100">
                  {item.cover_image_url
                    ? <img src={item.cover_image_url} alt={item.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl">🏗️</div>}
                  <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id}
                    className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-lg text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-[11px] font-bold text-gray-800 mb-1 leading-tight">{item.title}</p>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: (st?.color ?? "#6B7280") + "18", color: st?.color ?? "#6B7280" }}>
                    {st?.label ?? item.status}
                  </span>
                  {item.notes && <p className="text-[10px] text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{item.notes}</p>}
                  <button className="mt-2.5 w-full py-1.5 rounded-lg text-[10px] font-bold text-white flex items-center justify-center gap-1"
                    style={{ backgroundColor: "#1B3A6B" }}>
                    <TrendingUp size={10} /> Get Estimates
                  </button>
                </div>
              </div>
            );
          })}
          {!adding && (
            <button onClick={() => setAdding(true)}
              className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50 transition-colors text-gray-400 hover:text-blue-500 min-h-[120px]">
              <Plus size={22} />
              <span className="text-xs font-semibold">Add Project</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
