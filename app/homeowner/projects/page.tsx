"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Star, DollarSign, Clock, Shield, FileText, Trash2, Briefcase } from "lucide-react";

type Project = {
  id: string;
  title: string;
  contractor_name: string | null;
  description: string | null;
  cost: number | null;
  project_date: string | null;
  completed_date: string | null;
  rating: number | null;
  has_warranty: boolean;
  has_documentation: boolean;
  status: string;
};

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={11} fill={i <= Math.round(rating) ? "#F59E0B" : "none"} stroke={i <= Math.round(rating) ? "#F59E0B" : "#D1D5DB"} />
      ))}
      <span className="text-xs font-bold text-gray-700 ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/homeowner/projects")
      .then(r => r.json())
      .then(({ projects }) => setProjects(projects ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this project?")) return;
    setDeleting(id);
    await fetch(`/api/homeowner/projects/${id}`, { method: "DELETE" });
    setProjects(p => p.filter(x => x.id !== id));
    setDeleting(null);
  }

  const totalInvested = projects.reduce((s, p) => s + (p.cost ?? 0), 0);
  const avgRating = projects.filter(p => p.rating).length > 0
    ? projects.filter(p => p.rating).reduce((s, p) => s + (p.rating ?? 0), 0) / projects.filter(p => p.rating).length
    : null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Projects</h1>
          <p className="text-xs text-gray-400">Your completed home improvement history</p>
        </div>
        <Link href="/homeowner/projects/new"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white"
          style={{ backgroundColor: "#1B3A6B" }}>
          <Plus size={14} /> Add Project
        </Link>
      </div>

      {/* Summary strip */}
      {projects.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Projects", value: projects.length.toString(), icon: Briefcase },
            { label: "Total Invested", value: `$${(totalInvested / 1000).toFixed(1)}k`, icon: DollarSign },
            { label: "Avg Rating", value: avgRating ? `${avgRating.toFixed(1)} ★` : "—", icon: Star },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
              <Icon size={16} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-lg font-bold text-gray-900">{value}</p>
                <p className="text-[10px] text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
          <p className="text-5xl mb-4">🏗️</p>
          <h2 className="text-lg font-bold text-gray-800 mb-1">No projects yet</h2>
          <p className="text-sm text-gray-400 mb-5">Log your first home improvement project to start building your property history.</p>
          <Link href="/homeowner/projects/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: "#1B3A6B" }}>
            <Plus size={15} /> Add First Project
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(proj => (
            <div key={proj.id} className="bg-white rounded-2xl p-5 shadow-sm flex gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-gray-900">{proj.title}</h3>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${proj.status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {proj.status === "completed" ? "Completed" : "In Progress"}
                  </span>
                </div>
                {proj.contractor_name && (
                  <p className="text-xs text-gray-500 mb-1.5">by <span className="font-semibold text-blue-600">{proj.contractor_name}</span></p>
                )}
                {proj.rating && <div className="mb-2"><StarRow rating={proj.rating} /></div>}
                {proj.description && <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{proj.description}</p>}
                <div className="flex items-center gap-4 text-[10px] text-gray-400 flex-wrap">
                  {proj.cost && <span className="flex items-center gap-1"><DollarSign size={10} />${proj.cost.toLocaleString()}</span>}
                  {(proj.completed_date || proj.project_date) && <span className="flex items-center gap-1"><Clock size={10} />{fmtDate(proj.completed_date ?? proj.project_date)}</span>}
                  {proj.has_warranty && <span className="flex items-center gap-1 text-green-600"><Shield size={10} />Warranty</span>}
                  {proj.has_documentation && <span className="flex items-center gap-1 text-blue-600"><FileText size={10} />Docs</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(proj.id)} disabled={deleting === proj.id}
                className="shrink-0 p-2 text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
