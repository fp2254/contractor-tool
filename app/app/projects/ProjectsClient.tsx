"use client";

import { useState, useRef } from "react";

export type ProjectPhoto = { url: string; caption: string };

export type Project = {
  id: string;
  title: string;
  description: string;
  status: "in_progress" | "completed";
  location: string;
  completed_at: string | null;
  photos: ProjectPhoto[];
  tags: string[];
  created_at: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  in_progress: { label: "In Progress", color: "#D97706", bg: "#FEF3C7" },
  completed:   { label: "Completed",   color: "#16A34A", bg: "#DCFCE7" },
};

const EMPTY_FORM = {
  title: "",
  description: "",
  status: "completed" as const,
  location: "",
  completed_at: "",
  tags: "",
};

export default function ProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formPhotos, setFormPhotos] = useState<ProjectPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormPhotos([]);
    setShowForm(true);
  }

  function openEdit(p: Project) {
    setEditingId(p.id);
    setForm({
      title: p.title,
      description: p.description,
      status: p.status,
      location: p.location,
      completed_at: p.completed_at ?? "",
      tags: (p.tags ?? []).join(", "),
    });
    setFormPhotos(p.photos ?? []);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        photos: formPhotos,
      };
      if (editingId) {
        const res = await fetch(`/api/projects/api/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await res.json();
        if (res.ok) setProjects(ps => ps.map(p => p.id === editingId ? j.project : p));
      } else {
        const res = await fetch("/api/projects/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await res.json();
        if (res.ok) setProjects(ps => [j.project, ...ps]);
      }
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this project?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/projects/api/${id}`, { method: "DELETE" });
      setProjects(ps => ps.filter(p => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const idx = formPhotos.length;
    const local = URL.createObjectURL(file);
    setFormPhotos(prev => [...prev, { url: local, caption: "" }]);
    setUploadingIdx(idx);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/gallery-photo", { method: "POST", body: fd });
      const j = await res.json() as { url?: string };
      if (j.url) {
        setFormPhotos(prev => prev.map((ph, i) => i === idx ? { ...ph, url: j.url! } : ph));
      }
    } finally {
      setUploadingIdx(null);
      (e.target as HTMLInputElement).value = "";
    }
  }

  const inputCls = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div className="space-y-3">
      {/* New Project button */}
      <button
        onClick={openNew}
        className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-sm"
        style={{ backgroundColor: "#1B3A6B" }}
      >
        + New Project
      </button>

      {/* Form sheet */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-slate-800 text-sm">
              {editingId ? "Edit Project" : "New Project"}
            </p>
            <button onClick={() => setShowForm(false)} className="text-gray-400 text-lg leading-none">✕</button>
          </div>
          <div className="px-4 py-4 space-y-3">
            <div>
              <label className={labelCls}>Project Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Full roof replacement — Oak Street"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                  className={inputCls}
                >
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Date Completed</label>
                <input
                  type="date"
                  value={form.completed_at}
                  onChange={e => setForm(f => ({ ...f, completed_at: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Location</label>
              <input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Portland, OR"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What was done, materials used, scope of work, results…"
                className={`${inputCls} resize-none`}
              />
            </div>

            <div>
              <label className={labelCls}>Tags (comma-separated)</label>
              <input
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="e.g. Roofing, Residential, Before & After"
                className={inputCls}
              />
            </div>

            {/* Photos */}
            <div>
              <label className={labelCls}>Project Photos</label>
              {formPhotos.length > 0 && (
                <div className="space-y-2 mb-2">
                  {formPhotos.map((ph, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2 border border-gray-100">
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                        <img src={ph.url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <input
                        value={ph.caption}
                        onChange={e => setFormPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, caption: e.target.value } : p))}
                        placeholder="Caption (optional)"
                        className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-100 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setFormPhotos(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-red-400 text-sm leading-none flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} multiple />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingIdx !== null}
                className="w-full rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-sm font-semibold text-gray-400 active:border-blue-200 active:text-blue-500 transition-colors disabled:opacity-50"
              >
                {uploadingIdx !== null ? "Uploading…" : "+ Add Photo"}
              </button>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: "#1B3A6B" }}
            >
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Project"}
            </button>
          </div>
        </div>
      )}

      {/* Project list */}
      {projects.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl shadow-sm px-4 py-10 text-center">
          <p className="text-2xl mb-2">🏗️</p>
          <p className="text-sm font-semibold text-slate-700 mb-1">No projects yet</p>
          <p className="text-xs text-gray-400">Add your first completed project to build your portfolio.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => {
            const s = STATUS_LABELS[p.status] ?? STATUS_LABELS.completed;
            return (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Photos strip */}
                {p.photos?.length > 0 && (
                  <div className="flex gap-1 overflow-x-auto px-3 pt-3">
                    {p.photos.map((ph, i) => (
                      <div key={i} className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                        <img src={ph.url} alt={ph.caption} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-slate-800 text-sm leading-snug flex-1">{p.title}</p>
                    <span
                      className="text-[10px] font-bold rounded-full px-2 py-0.5 flex-shrink-0"
                      style={{ color: s.color, background: s.bg }}
                    >
                      {s.label}
                    </span>
                  </div>
                  {p.location && (
                    <p className="text-xs text-gray-400 mb-1">📍 {p.location}</p>
                  )}
                  {p.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{p.description}</p>
                  )}
                  {p.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {p.tags.map((tag, i) => (
                        <span key={i} className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="flex-1 rounded-xl border border-gray-200 py-2 text-xs font-semibold text-slate-600 bg-gray-50 active:bg-gray-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      className="rounded-xl border border-red-100 py-2 px-4 text-xs font-semibold text-red-500 bg-red-50 active:bg-red-100 disabled:opacity-50"
                    >
                      {deletingId === p.id ? "…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
