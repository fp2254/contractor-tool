"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Plus, Upload, Trash2, Edit3, MapPin, Tag, Gamepad2, 
  X, Trophy, Zap, Crosshair, Star, CheckCircle2, Shield
} from "lucide-react";

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

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  in_progress: { label: "IN PROGRESS", color: "#000", bg: "#FDE047" }, // Yellow
  completed:   { label: "COMPLETED",   color: "#000", bg: "#4ADE80" }, // Neon Green
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
  const [celebration, setCelebration] = useState(false);
  
  const fileRef = useRef<HTMLInputElement>(null);

  // Gamification Mechanics
  const xpPerProject = 100;
  const totalXp = projects.length * xpPerProject;
  const level = Math.floor(projects.length / 3) + 1;
  const xpToNextLevel = level * 3 * xpPerProject;
  const progressPct = Math.min(100, Math.round((totalXp / xpToNextLevel) * 100));

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
      
      const isNew = !editingId;

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

      if (isNew && !saveError) {
        setCelebration(true);
        setTimeout(() => setCelebration(false), 2500);
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

  const inputCls = "w-full rounded-xl border-[3px] border-black px-4 py-3 text-sm font-bold text-black outline-none focus:ring-4 focus:ring-pink-400 bg-white placeholder:text-gray-400 shadow-[4px_4px_0_0_#000] transition-all";
  const labelCls = "block text-xs font-black text-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5";

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Celebration Overlay */}
      {celebration && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="animate-bounce bg-yellow-400 border-[6px] border-black p-8 rounded-3xl shadow-[12px_12px_0_0_#000] text-center transform rotate-[-2deg]">
            <Trophy size={80} className="mx-auto text-black mb-4" />
            <h2 className="text-4xl font-black uppercase tracking-tighter text-black">Project Added!</h2>
            <p className="text-xl font-bold text-black mt-2">+100 XP Gained</p>
          </div>
        </div>
      )}

      {/* Gamified Header / Stats Bar */}
      <div className="bg-purple-500 border-[4px] border-black rounded-2xl shadow-[6px_6px_0_0_#000] p-4 text-black relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-20 transform translate-x-4 -translate-y-4">
          <Gamepad2 size={120} />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-14 h-14 bg-yellow-400 border-[3px] border-black rounded-xl flex items-center justify-center shadow-[3px_3px_0_0_#000] transform -rotate-3">
              <Zap size={28} className="text-black fill-black" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest opacity-90">Current Rank</div>
              <div className="text-2xl font-black uppercase tracking-tight">Level {level} Builder</div>
            </div>
          </div>
          
          <div className="w-full sm:w-64 bg-white/20 p-3 rounded-xl border-[3px] border-black shadow-[3px_3px_0_0_#000]">
            <div className="flex justify-between text-xs font-black uppercase mb-1.5">
              <span>XP: {totalXp}</span>
              <span>Next: {xpToNextLevel}</span>
            </div>
            <div className="h-4 bg-black rounded-full overflow-hidden border-[2px] border-black relative">
              <div 
                className="absolute top-0 left-0 h-full bg-yellow-400 transition-all duration-1000 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* New Project button */}
      <button
        onClick={openNew}
        className="w-full rounded-2xl py-4 text-lg font-black uppercase tracking-wider text-black bg-lime-400 border-[4px] border-black shadow-[6px_6px_0_0_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[4px_4px_0_0_#000] active:translate-y-[6px] active:translate-x-[6px] active:shadow-none transition-all flex items-center justify-center gap-2"
      >
        <Crosshair size={24} /> Log New Project
      </button>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-cyan-300 w-full max-w-2xl rounded-3xl border-[4px] border-black shadow-[12px_12px_0_0_#000] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-black text-white px-5 py-4 flex items-center justify-between border-b-[4px] border-black shrink-0">
              <p className="font-black uppercase tracking-widest text-lg flex items-center gap-2">
                <Star className="text-yellow-400 fill-yellow-400" size={20} />
                {editingId ? "Modify Mission" : "New Mission"}
              </p>
              <button onClick={() => { setShowForm(false); setSaveError(null); }} className="hover:rotate-90 transition-transform bg-white/20 p-1 rounded-lg">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-gray-50 flex-1 space-y-5">
              {saveError && (
                <div className="bg-red-400 border-[3px] border-black px-4 py-3 rounded-xl shadow-[4px_4px_0_0_#000] text-sm text-black font-bold flex items-center gap-2">
                  <Shield size={18} /> {saveError}
                </div>
              )}
              
              <div>
                <label className={labelCls}>Mission Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Roof Replacement Alpha"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className={labelCls}>Date Achieved</label>
                  <input
                    type="date"
                    value={form.completed_at}
                    onChange={e => setForm(f => ({ ...f, completed_at: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Location Area</label>
                <input
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Sector 7, Portland"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Mission Brief (Description)</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Details of the job, tactics used..."
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Bounty ($)</label>
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
                  <label className={labelCls}>Tags (comma-separated)</label>
                  <input
                    value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="e.g. Roofing, HardMode"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Photos */}
              <div className="bg-white border-[3px] border-black rounded-2xl p-4 shadow-[4px_4px_0_0_#000]">
                <label className={labelCls}><Upload size={16} /> Mission Intel (Photos)</label>
                {formPhotos.length > 0 && (
                  <div className="space-y-3 mb-4 mt-2">
                    {formPhotos.map((ph, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-100 rounded-xl p-2 border-[2px] border-black">
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-[2px] border-black bg-black">
                          <img src={ph.url} alt="" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                        </div>
                        <input
                          value={ph.caption}
                          onChange={e => setFormPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, caption: e.target.value } : p))}
                          placeholder="Intel Caption (optional)"
                          className="flex-1 rounded-lg border-[2px] border-black px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-300 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setFormPhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="bg-red-500 text-white p-2 rounded-lg border-[2px] border-black shadow-[2px_2px_0_0_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0_0_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none flex-shrink-0"
                        >
                          <Trash2 size={16} />
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
                  className="w-full rounded-xl border-[3px] border-dashed border-black py-4 text-sm font-black uppercase tracking-widest text-black bg-gray-50 hover:bg-yellow-200 transition-colors disabled:opacity-50"
                >
                  {uploadingIdx !== null ? "UPLOADING DATA..." : "+ ADD PHOTO INTEL"}
                </button>
              </div>
            </div>

            <div className="p-5 bg-white border-t-[4px] border-black shrink-0">
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="w-full rounded-2xl py-4 text-lg font-black uppercase tracking-wider text-black bg-pink-500 border-[4px] border-black shadow-[6px_6px_0_0_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[4px_4px_0_0_#000] active:translate-y-[6px] active:translate-x-[6px] active:shadow-none transition-all disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:translate-x-0 disabled:hover:shadow-[6px_6px_0_0_#000]"
              >
                {saving ? "SAVING..." : editingId ? "COMMIT CHANGES" : "SECURE MISSION"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project list */}
      {projects.length === 0 && !showForm ? (
        <div className="bg-white border-[4px] border-black rounded-3xl shadow-[8px_8px_0_0_#000] px-6 py-16 text-center">
          <Gamepad2 size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-2xl font-black uppercase text-black mb-2 tracking-tight">Zero Missions Logged</p>
          <p className="text-sm font-bold text-gray-500">Log your first project to start earning XP and rank up.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {projects.map(p => {
            const s = STATUS_LABELS[p.status] ?? STATUS_LABELS.completed;
            return (
              <div key={p.id} className="bg-white border-[4px] border-black rounded-2xl shadow-[6px_6px_0_0_#000] overflow-hidden hover:-translate-y-1 transition-transform group">
                {/* Photos strip */}
                {p.photos?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto p-3 bg-gray-900 border-b-[4px] border-black">
                    {p.photos.map((ph, i) => (
                      <div key={i} className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-[3px] border-black bg-black">
                        <img src={ph.url} alt={ph.caption} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="font-black text-2xl uppercase tracking-tight text-black leading-none flex-1">{p.title}</p>
                    <span
                      className="text-[10px] font-black uppercase tracking-widest border-[2px] border-black rounded-full px-3 py-1 flex-shrink-0 shadow-[2px_2px_0_0_#000]"
                      style={{ color: s.color, background: s.bg }}
                    >
                      {s.label}
                    </span>
                  </div>
                  {p.location && (
                    <p className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                      <MapPin size={14} className="text-black" /> {p.location}
                    </p>
                  )}
                  {p.description && (
                    <p className="text-sm font-medium text-gray-700 leading-relaxed mb-4 bg-gray-50 border-[2px] border-gray-200 p-3 rounded-xl">
                      {p.description}
                    </p>
                  )}
                  {p.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {p.tags.map((tag, i) => (
                        <span key={i} className="text-[10px] font-black uppercase tracking-widest bg-cyan-200 border-[2px] border-black text-black rounded-lg px-2.5 py-1 shadow-[2px_2px_0_0_#000]">
                          <Tag size={10} className="inline mr-1" />{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 mt-4 pt-4 border-t-[3px] border-gray-100">
                    <button
                      onClick={() => openEdit(p)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border-[3px] border-black py-2.5 text-sm font-black uppercase text-black bg-yellow-300 shadow-[3px_3px_0_0_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[2px_2px_0_0_#000] active:translate-y-[3px] active:translate-x-[3px] active:shadow-none transition-all"
                    >
                      <Edit3 size={16} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      className="flex items-center justify-center gap-2 rounded-xl border-[3px] border-black py-2.5 px-5 text-sm font-black uppercase text-white bg-red-500 shadow-[3px_3px_0_0_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[2px_2px_0_0_#000] active:translate-y-[3px] active:translate-x-[3px] active:shadow-none transition-all disabled:opacity-50"
                    >
                      {deletingId === p.id ? "..." : <Trash2 size={16} />}
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
