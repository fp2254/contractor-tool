"use client";

import { useState } from "react";
import Link from "next/link";

type Template = {
  id: string;
  name: string;
  description: string | null;
  required_photo_count: number;
  allow_tech_send_invoice_warranty: boolean;
  is_active: boolean;
  created_at: string;
};

type TemplateDetail = Template & {
  warranty_title: string | null;
  warranty_body: string | null;
  fields: { id: string; label: string; field_type: string; required: boolean; options: string[] | null }[];
  invoiceItems: { id: string; description: string; amount: number }[];
};

const FIELD_TYPE_LABEL: Record<string, string> = {
  short_text: "Text",
  dropdown: "Dropdown",
  yes_no: "Yes / No",
};

function TemplateQuickView({
  templateId,
  onClose,
}: {
  templateId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch on first render
  useState(() => {
    fetch(`/app/templates/api/${templateId}`)
      .then(r => r.json())
      .then((json: { template?: TemplateDetail; fields?: TemplateDetail["fields"]; invoiceItems?: TemplateDetail["invoiceItems"]; error?: string }) => {
        if (json.error) throw new Error(json.error);
        setData({ ...json.template!, fields: json.fields ?? [], invoiceItems: json.invoiceItems ?? [] });
      })
      .catch(e => setError(e.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  });

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-xl max-h-[85vh] flex flex-col">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-base font-bold text-slate-800 leading-tight">
              {loading ? "Loading…" : (data?.name ?? "Template")}
            </p>
            {data && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {!data.is_active && (
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 uppercase tracking-wide">Inactive</span>
                )}
                {data.allow_tech_send_invoice_warranty && (
                  <span className="text-[10px] font-bold bg-green-100 text-green-700 rounded-full px-2 py-0.5">Tech can send</span>
                )}
                {data.required_photo_count > 0 && (
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
                    📷 {data.required_photo_count} photos required
                  </span>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center flex-shrink-0">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5 pb-8">
          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <svg className="animate-spin h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Loading template…
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
          )}

          {data && (
            <>
              {/* Description */}
              {data.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{data.description}</p>
                </div>
              )}

              {/* Fields */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Fields ({data.fields.length})
                </p>
                {data.fields.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No fields defined.</p>
                ) : (
                  <div className="space-y-2">
                    {data.fields.map((f, i) => (
                      <div key={f.id ?? i} className="flex items-start justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 leading-snug">{f.label}</p>
                          {f.field_type === "dropdown" && f.options?.length ? (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{f.options.join(" · ")}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[10px] bg-white border border-gray-200 text-gray-500 rounded-full px-2 py-0.5 font-medium">
                            {FIELD_TYPE_LABEL[f.field_type] ?? f.field_type}
                          </span>
                          {f.required && (
                            <span className="text-[10px] bg-red-50 text-red-600 border border-red-100 rounded-full px-2 py-0.5 font-medium">Required</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invoice Items */}
              {data.invoiceItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Invoice Items ({data.invoiceItems.length})
                  </p>
                  <div className="space-y-1.5">
                    {data.invoiceItems.map((item, i) => (
                      <div key={item.id ?? i} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
                        <p className="text-sm text-slate-800 flex-1 min-w-0 truncate">{item.description}</p>
                        <p className="text-sm font-bold text-[#1B3A6B] flex-shrink-0 ml-3">
                          {item.amount > 0 ? `$${Number(item.amount).toFixed(2)}` : "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warranty */}
              {(data.warranty_title || data.warranty_body) && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Warranty / Terms</p>
                  <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-1">
                    {data.warranty_title && (
                      <p className="text-sm font-semibold text-slate-800">{data.warranty_title}</p>
                    )}
                    {data.warranty_body && (
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{data.warranty_body}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Edit button */}
              <Link
                href={`/app/templates/${templateId}`}
                className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white text-sm font-semibold"
                style={{ backgroundColor: "#1B3A6B" }}
                onClick={onClose}>
                ✏️ Edit Template
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TemplatesClient({ templates: initial }: { templates: Template[] }) {
  const [templates, setTemplates] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

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
      if (!res.ok) { alert(json.error ?? "Could not delete template."); return; }
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
                <button
                  type="button"
                  onClick={() => setViewingId(t.id)}
                  className="flex-1 min-w-0 text-left">
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
                    {t.required_photo_count > 0 ? `📷 ${t.required_photo_count} required photos` : "No photo requirement"}
                    {" · "}
                    <span className="text-[#1B3A6B] font-medium">Tap to preview →</span>
                  </p>
                </button>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setViewingId(t.id)}
                    className="text-xs font-semibold rounded-lg px-2.5 py-1.5 bg-blue-50 text-[#1B3A6B] border border-blue-100">
                    View
                  </button>
                  <Link
                    href={`/app/templates/${t.id}`}
                    className="text-xs font-semibold rounded-lg px-2.5 py-1.5 text-white"
                    style={{ backgroundColor: "#1B3A6B" }}>
                    Edit
                  </Link>
                  <button
                    onClick={() => handleToggleActive(t)}
                    disabled={toggling === t.id}
                    className="text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-gray-200 text-gray-600 disabled:opacity-40">
                    {toggling === t.id ? "…" : t.is_active ? "Off" : "On"}
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    disabled={deleting === t.id}
                    className="text-xs font-semibold rounded-lg px-2 py-1.5 bg-red-50 text-red-600 border border-red-100 disabled:opacity-40">
                    {deleting === t.id ? "…" : "🗑"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {viewingId && (
        <TemplateQuickView
          templateId={viewingId}
          onClose={() => setViewingId(null)}
        />
      )}
    </div>
  );
}
