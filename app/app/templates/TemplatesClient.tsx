"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Template = {
  id: string;
  name: string;
  description: string | null;
  required_photo_count: number;
  allow_tech_send_invoice_warranty: boolean;
  is_active: boolean;
  created_at: string;
};

export default function TemplatesClient({ templates: initial }: { templates: Template[] }) {
  const [templates, setTemplates] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const router = useRouter();

  async function handleToggleActive(t: Template) {
    setToggling(t.id);
    try {
      const res = await fetch(`/app/templates/api/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !t.is_active }),
      });
      if (res.ok) {
        setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !t.is_active } : x));
      }
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(t: Template) {
    if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    setDeleting(t.id);
    try {
      const res = await fetch(`/app/templates/api/${t.id}`, { method: "DELETE" });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        alert(json.error ?? "Could not delete template.");
        return;
      }
      setTemplates(prev => prev.filter(x => x.id !== t.id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-3">
      <Link
        href="/app/templates/new"
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white font-semibold"
        style={{ backgroundColor: "#1B3A6B" }}>
        <span className="text-lg leading-none">+</span> New Template
      </Link>

      {templates.length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
          <p className="text-2xl mb-2">🗂️</p>
          <p className="text-sm font-medium">No templates yet.</p>
          <p className="text-xs mt-1">Create a template to standardise your job fields, photos, and invoice items.</p>
        </div>
      )}

      <div className="space-y-2">
        {templates.map(t => (
          <div key={t.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-800 leading-snug">{t.name}</p>
                    {!t.is_active && (
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 uppercase tracking-wide">Inactive</span>
                    )}
                    {t.allow_tech_send_invoice_warranty && (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 rounded-full px-2 py-0.5">Tech can send</span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-gray-500 mt-1 leading-snug line-clamp-2">{t.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {t.required_photo_count > 0 ? `${t.required_photo_count} required photos` : "No photo requirement"}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(t)}
                    disabled={toggling === t.id}
                    className="text-xs font-semibold rounded-lg px-3 py-1.5 border border-gray-200 text-gray-600 disabled:opacity-40">
                    {toggling === t.id ? "…" : t.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <Link
                    href={`/app/templates/${t.id}`}
                    className="text-xs font-semibold rounded-lg px-3 py-1.5 text-white"
                    style={{ backgroundColor: "#1B3A6B" }}>
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(t)}
                    disabled={deleting === t.id}
                    className="text-xs font-semibold rounded-lg px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-100 disabled:opacity-40">
                    {deleting === t.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
