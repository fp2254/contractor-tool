"use client";

import { useState, useRef } from "react";
import { Plus, Upload, Trash2, Edit3, MapPin, Tag, X, CheckCircle, Clock } from "lucide-react";

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
  cost?: number | null;
  created_at: string;
};

const NAVY = "#1B3A6B";
const GREEN = "#16a34a";

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  in_progress: { label: "In Progress", color: "#92400e", bg: "#fef3c7" },
  completed:   { label: "Completed",   color: "#14532d", bg: "#dcfce7" },
};

const EMPTY_FORM = {
  title: "",
  description: "",
  status: "completed" as "in_progress" | "completed",
  location: "",
  completed_at: "",
  tags: "",
  cost: "",
};

function fmtMoney(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
  return `$${n.toLocaleString()}`;
}

export default function ProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formPhotos, setFormPhotos] = useState<ProjectPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
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
      cost: p.cost ? String(p.cost) : "",
    });
    setFormPhotos(p.photos ?? []);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        photos: formPhotos,
        cost: form.cost ? parseFloat(form.cost) : null,
      };

      if (editingId) {
        const res = await fetch(`/api/projects/api/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await res.json();
        if (res.ok) {
          setProjects(ps => ps.map(p => p.id === editingId ? j.project : p));
          setShowForm(false);
        } else {
          setSaveError(j.error ?? "Failed to save. Please try again.");
        }
      } else {
        const res = await fetch("/api/projects/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await res.json();
        if (res.ok) {
          setProjects(ps => [j.project, ...ps]);
          setShowForm(false);
        } else {
          setSaveError(j.error ?? "Failed to save. Please try again.");
        }
      }
    } catch {
      setSaveError("Network error. Please try again.");
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

  const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white placeholder:text-gray-400 transition-all";
  const labelCls = "block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1";

  return (
    <div className="space-y-4 pb-20">

      {/* Add project button */}
      <button
        onClick={openNew}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white bg-[#1B3A6B] hover:bg-[#152d55] active:bg-[#0f2040] transition-colors"
      >
        <Plus size={18} /> Add Project
      </button>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-base">
                {editingId ? "Edit Project" : "New Project"}
              </h2>
              <button
                onClick={() => { setShowForm(false); setSaveError(null); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {saveError}
                </div>
              )}

              <div>
                <label className={labelCls}>Project Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Roof Replacement — 3-bed Colonial"
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
                  <label className={labelCls}>Completion Date</label>
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
                  placeholder="e.g. Portland, ME"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of the job scope and results…"
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Project Value ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cost}
                    onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                    placeholder="e.g. 12500"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Tags (comma-sep)</label>
                  <input
                    value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="e.g. Roofing, Gutters"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Photos */}
              <div>
                <label className={labelCls}><span className="flex items-center gap-1"><Upload size={12} /> Photos</span></label>
                {formPhotos.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {formPhotos.map((ph, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2 border border-gray-200">
                        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                          <img src={ph.url} alt="" className="w-full h-full object-cover" />
                        </div>
                        <input
                          value={ph.caption}
                          onChange={e => setFormPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, caption: e.target.value } : p))}
                          placeholder="Caption (optional)"
                          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-blue-400 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setFormPhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-red-400 hover:text-red-600 p-1 rounded"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingIdx !== null}
                  className="w-full rounded-lg border border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                >
                  {uploadingIdx !== null ? "Uploading…" : "+ Add Photo"}
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="w-full rounded-xl py-3 text-sm font-bold text-white bg-[#1B3A6B] hover:bg-[#152d55] disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : editingId ? "Save Changes" : "Add Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project list */}
      {projects.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-14 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <p className="font-semibold text-gray-700 mb-1">No projects yet</p>
          <p className="text-sm text-gray-400">Add your first project to build out your showcase.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map(p => {
            const s = STATUS[p.status] ?? STATUS.completed;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Photos */}
                {p.photos?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto p-3 bg-gray-50 border-b border-gray-100">
                    {p.photos.map((ph, i) => (
                      <div key={i} className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-200">
                        <img src={ph.url} alt={ph.caption} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-bold text-gray-900 text-base leading-snug flex-1">{p.title}</p>
                    <span
                      className="text-xs font-semibold rounded-full px-2.5 py-0.5 flex-shrink-0 flex items-center gap-1"
                      style={{ color: s.color, background: s.bg }}
                    >
                      {p.status === "completed"
                        ? <CheckCircle size={11} />
                        : <Clock size={11} />
                      }
                      {s.label}
                    </span>
                  </div>

                  {p.location && (
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      <MapPin size={11} /> {p.location}
                    </p>
                  )}

                  {p.cost != null && p.cost > 0 && (
                    <p className="text-sm font-semibold text-[#1B3A6B] mb-2">{fmtMoney(p.cost)}</p>
                  )}

                  {p.description && (
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">{p.description}</p>
                  )}

                  {p.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {p.tags.map((tag, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                          <Tag size={9} />{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {p.completed_at && (
                    <p className="text-xs text-gray-400 mb-3">
                      Completed {new Date(p.completed_at + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </p>
                  )}

                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openEdit(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-red-100 py-2 px-4 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {deletingId === p.id ? "…" : <Trash2 size={13} />}
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
