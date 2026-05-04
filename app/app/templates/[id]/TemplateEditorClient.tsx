"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FieldType = "short_text" | "dropdown" | "yes_no";

type Field = {
  id?: string;
  label: string;
  field_type: FieldType;
  required: boolean;
  sort_order: number;
  options: string[];
};

type InvoiceItem = {
  id?: string;
  description: string;
  amount: number;
  sort_order: number;
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  required_photo_count: number;
  allow_tech_send_invoice_warranty: boolean;
  warranty_title: string | null;
  warranty_body: string | null;
  is_active: boolean;
};

function emptyField(sort_order: number): Field {
  return { label: "", field_type: "short_text", required: false, sort_order, options: [] };
}

function emptyInvoiceItem(sort_order: number): InvoiceItem {
  return { description: "", amount: 0, sort_order };
}

export default function TemplateEditorClient({
  template,
  fields: initialFields,
  invoiceItems: initialInvoiceItems,
}: {
  template: Template | null;
  fields: Field[];
  invoiceItems: InvoiceItem[];
}) {
  const router = useRouter();
  const isNew = !template;

  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [photoCount, setPhotoCount] = useState(template?.required_photo_count ?? 0);
  const [allowTechSend, setAllowTechSend] = useState(template?.allow_tech_send_invoice_warranty ?? false);
  const [warrantyTitle, setWarrantyTitle] = useState(template?.warranty_title ?? "");
  const [warrantyBody, setWarrantyBody] = useState(template?.warranty_body ?? "");
  const [isActive, setIsActive] = useState(template?.is_active ?? true);

  const [fields, setFields] = useState<Field[]>(
    initialFields.map(f => ({
      ...f,
      options: Array.isArray(f.options) ? f.options : [],
    }))
  );
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>(initialInvoiceItems);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function addField() {
    setFields(prev => [...prev, emptyField(prev.length)]);
  }

  function removeField(i: number) {
    setFields(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateField<K extends keyof Field>(i: number, key: K, value: Field[K]) {
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, [key]: value } : f));
  }

  function addOption(fieldIdx: number) {
    setFields(prev => prev.map((f, idx) =>
      idx === fieldIdx ? { ...f, options: [...f.options, ""] } : f
    ));
  }

  function updateOption(fieldIdx: number, optIdx: number, value: string) {
    setFields(prev => prev.map((f, idx) =>
      idx === fieldIdx
        ? { ...f, options: f.options.map((o, oi) => oi === optIdx ? value : o) }
        : f
    ));
  }

  function removeOption(fieldIdx: number, optIdx: number) {
    setFields(prev => prev.map((f, idx) =>
      idx === fieldIdx
        ? { ...f, options: f.options.filter((_, oi) => oi !== optIdx) }
        : f
    ));
  }

  function addInvoiceItem() {
    setInvoiceItems(prev => [...prev, emptyInvoiceItem(prev.length)]);
  }

  function removeInvoiceItem(i: number) {
    setInvoiceItems(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateInvoiceItem<K extends keyof InvoiceItem>(i: number, key: K, value: InvoiceItem[K]) {
    setInvoiceItems(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: value } : item));
  }

  async function handleSave() {
    if (!name.trim()) { setError("Template name is required."); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        required_photo_count: photoCount,
        allow_tech_send_invoice_warranty: allowTechSend,
        warranty_title: warrantyTitle.trim() || null,
        warranty_body: warrantyBody.trim() || null,
        is_active: isActive,
        fields: fields.map((f, i) => ({
          ...f,
          sort_order: i,
          options: f.field_type === "dropdown" ? f.options.filter(o => o.trim()) : null,
        })),
        invoice_items: invoiceItems.map((item, i) => ({ ...item, sort_order: i })),
      };

      const url = isNew ? "/app/templates/api" : `/app/templates/api/${template!.id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json() as { id?: string; error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to save template."); return; }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);

      if (isNew && json.id) {
        router.replace(`/app/templates/${json.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="space-y-4">
      {saved && (
        <div className="rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-3">
          ✓ Template saved
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
      )}

      {/* ── Basic Info ── */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Basic Info</p>
        <div>
          <label className={labelCls}>Template Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Standard Installation"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional description of when to use this template"
            rows={2}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white resize-none"
          />
        </div>
        <div>
          <label className={labelCls}>Required Photo Count</label>
          <input
            type="number"
            min={0}
            value={photoCount}
            onChange={e => setPhotoCount(Math.max(0, Number(e.target.value)))}
            className="w-24 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          />
          <p className="text-xs text-gray-400 mt-1">Minimum photos required to complete a job using this template. Set 0 for no requirement.</p>
        </div>
      </div>

      {/* ── Permissions ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div
          className="flex items-start gap-4 p-4 cursor-pointer"
          onClick={() => setAllowTechSend(v => !v)}>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-700">Allow tech to send invoice &amp; warranty</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">When on, field techs using this template can send the invoice and warranty directly to the customer after completing the job.</p>
          </div>
          <div className={`relative w-11 h-6 rounded-full flex-shrink-0 mt-0.5 transition-colors ${allowTechSend ? "" : "bg-gray-200"}`}
            style={allowTechSend ? { backgroundColor: "#1B3A6B" } : {}}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${allowTechSend ? "left-6" : "left-1"}`} />
          </div>
        </div>
      </div>

      {/* ── Custom Fields ── */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Custom Fields</p>
        <p className="text-xs text-gray-400 -mt-1">Add fields the tech must fill in when completing a job with this template.</p>

        {fields.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">No custom fields yet.</p>
        )}

        {fields.map((field, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={field.label}
                onChange={e => updateField(i, "label", e.target.value)}
                placeholder="Field label *"
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
              <select
                value={field.field_type}
                onChange={e => updateField(i, "field_type", e.target.value as FieldType)}
                className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100">
                <option value="short_text">Short text</option>
                <option value="dropdown">Dropdown</option>
                <option value="yes_no">Yes / No</option>
              </select>
              <button
                type="button"
                onClick={() => removeField(i)}
                className="w-8 h-8 rounded-lg border border-red-100 bg-red-50 text-red-400 text-base flex items-center justify-center flex-shrink-0">
                ✕
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={field.required}
                onChange={e => updateField(i, "required", e.target.checked)}
                className="rounded"
              />
              Required field
            </label>

            {field.field_type === "dropdown" && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Dropdown Options</p>
                {field.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      value={opt}
                      onChange={e => updateOption(i, oi, e.target.value)}
                      placeholder={`Option ${oi + 1}`}
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(i, oi)}
                      className="text-gray-300 hover:text-red-400 text-sm px-1">
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addOption(i)}
                  className="text-xs font-medium text-[#1B3A6B] py-1">
                  + Add Option
                </button>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addField}
          className="w-full rounded-xl border border-dashed border-gray-300 py-2.5 text-sm text-gray-500 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
          <span className="text-base leading-none">+</span> Add Field
        </button>
      </div>

      {/* ── Invoice Line Items ── */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Invoice Line Items</p>
          <p className="text-xs text-gray-400 mt-0.5">Default line items that will pre-fill invoices for this job type. {/* TODO Phase 2: connect to live invoice flow */}</p>
        </div>

        {invoiceItems.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">No line items yet.</p>
        )}

        {invoiceItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item.description}
              onChange={e => updateInvoiceItem(i, "description", e.target.value)}
              placeholder="Description *"
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            <div className="relative flex-shrink-0">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={item.amount}
                onChange={e => updateInvoiceItem(i, "amount", Number(e.target.value))}
                placeholder="0.00"
                className="w-24 rounded-xl border border-gray-200 pl-6 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <button
              type="button"
              onClick={() => removeInvoiceItem(i)}
              className="w-8 h-8 rounded-lg border border-red-100 bg-red-50 text-red-400 flex items-center justify-center flex-shrink-0 text-base">
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addInvoiceItem}
          className="w-full rounded-xl border border-dashed border-gray-300 py-2.5 text-sm text-gray-500 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
          <span className="text-base leading-none">+</span> Add Line Item
        </button>

        {invoiceItems.length > 0 && (
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
            <span className="text-xs font-semibold text-gray-500">Template Total</span>
            <span className="text-sm font-bold text-[#1B3A6B]">
              ${invoiceItems.reduce((s, it) => s + Number(it.amount), 0).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* ── Warranty ── */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Warranty</p>
          <p className="text-xs text-gray-400 mt-0.5">Pre-fill warranty text for jobs using this template. {/* TODO Phase 2: connect to warranty sending */}</p>
        </div>
        <div>
          <label className={labelCls}>Warranty Title</label>
          <input
            value={warrantyTitle}
            onChange={e => setWarrantyTitle(e.target.value)}
            placeholder="e.g. 1-Year Labour Warranty"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Warranty Terms</label>
          <textarea
            value={warrantyBody}
            onChange={e => setWarrantyBody(e.target.value)}
            placeholder="Describe the warranty terms, coverage, and exclusions…"
            rows={4}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white resize-none"
          />
        </div>
      </div>

      {/* ── Status ── */}
      {!isNew && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div
            className="flex items-center justify-between p-4 cursor-pointer"
            onClick={() => setIsActive(v => !v)}>
            <div>
              <p className="text-sm font-semibold text-slate-700">Template Active</p>
              <p className="text-xs text-gray-500 mt-0.5">Inactive templates are hidden from job creation but not deleted.</p>
            </div>
            <div className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${isActive ? "" : "bg-gray-200"}`}
              style={isActive ? { backgroundColor: "#1B3A6B" } : {}}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isActive ? "left-6" : "left-1"}`} />
            </div>
          </div>
        </div>
      )}

      {/* ── Save ── */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl py-3 text-white font-semibold disabled:opacity-60"
        style={{ backgroundColor: "#1B3A6B" }}>
        {saving ? "Saving…" : isNew ? "Create Template" : "Save Template"}
      </button>

      <button
        onClick={() => router.push("/app/templates")}
        className="w-full rounded-xl py-3 text-sm font-semibold bg-gray-100 text-gray-600">
        ← Back to Templates
      </button>
    </div>
  );
}
