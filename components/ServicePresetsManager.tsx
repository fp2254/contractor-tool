"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPreset,
  updatePreset,
  togglePresetActive,
  removePreset,
  type PresetData,
} from "@/app/app/profile/actions";
import { PriceSheetScanModal } from "@/components/PriceSheetScanModal";

export type Preset = {
  id: string;
  service_name: string;
  description: string | null;
  price_type: string;
  flat_rate: number | null;
  hourly_rate: number | null;
  estimated_hours: number | null;
  material_cost: number | null;
  unit: string | null;
  default_qty: number | null;
  category: string | null;
  tags: string[] | null;
  is_active: boolean;
  sort_order: number | null;
};

const UNITS = ["each", "ft", "hr", "job", "sqft", "lf", "lb", "day", "other"];
const CATEGORIES = ["radon", "crawlspace", "hvac", "water", "electric", "plumbing", "general"];

const inp =
  "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white";
const lbl = "block text-xs font-semibold text-gray-500 uppercase mb-1";
const grid2 = "grid grid-cols-2 gap-3";

function effectivePrice(p: Preset | PresetForm): number {
  const flatRate = typeof p.flat_rate === "string" ? parseFloat(p.flat_rate as string) : (p.flat_rate ?? 0);
  const hourlyRate = typeof p.hourly_rate === "string" ? parseFloat(p.hourly_rate as string) : (p.hourly_rate ?? 0);
  const hours = typeof p.estimated_hours === "string" ? parseFloat(p.estimated_hours as string) : (p.estimated_hours ?? 1);
  return p.price_type === "flat" ? flatRate : hourlyRate * hours;
}

type PresetForm = {
  service_name: string;
  description: string;
  price_type: "flat" | "hourly";
  flat_rate: string;
  hourly_rate: string;
  estimated_hours: string;
  material_cost: string;
  unit: string;
  default_qty: string;
  category: string;
  tags: string;
  is_active: boolean;
};

function blankForm(p?: Preset): PresetForm {
  return {
    service_name: p?.service_name ?? "",
    description: p?.description ?? "",
    price_type: (p?.price_type as "flat" | "hourly") ?? "flat",
    flat_rate: p?.flat_rate != null ? String(p.flat_rate) : "",
    hourly_rate: p?.hourly_rate != null ? String(p.hourly_rate) : "",
    estimated_hours: p?.estimated_hours != null ? String(p.estimated_hours) : "",
    material_cost: p?.material_cost != null ? String(p.material_cost) : "",
    unit: p?.unit ?? "each",
    default_qty: p?.default_qty != null ? String(p.default_qty) : "1",
    category: p?.category ?? "",
    tags: p?.tags?.join(", ") ?? "",
    is_active: p?.is_active ?? true,
  };
}

function formToData(f: PresetForm): PresetData {
  return {
    service_name: f.service_name,
    description: f.description,
    price_type: f.price_type,
    flat_rate: f.flat_rate ? parseFloat(f.flat_rate) : null,
    hourly_rate: f.hourly_rate ? parseFloat(f.hourly_rate) : null,
    estimated_hours: f.estimated_hours ? parseFloat(f.estimated_hours) : null,
    material_cost: f.material_cost ? parseFloat(f.material_cost) : null,
    unit: f.unit || "each",
    default_qty: parseFloat(f.default_qty) || 1,
    category: f.category,
    tags: f.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    is_active: f.is_active,
  };
}

function PresetFormFields({
  form,
  onChange,
}: {
  form: PresetForm;
  onChange: (f: PresetForm) => void;
}) {
  function set(key: keyof PresetForm, val: string | boolean) {
    onChange({ ...form, [key]: val });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={lbl}>Service Name *</label>
        <input
          value={form.service_name}
          onChange={(e) => set("service_name", e.target.value)}
          placeholder="e.g. Radon Mitigation Install"
          required
          className={inp}
        />
      </div>
      <div>
        <label className={lbl}>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Short description — helps AI match this preset"
          rows={2}
          className={inp}
        />
      </div>
      <div className={grid2}>
        <div>
          <label className={lbl}>Category</label>
          <input
            list="category-list"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="e.g. radon"
            className={inp}
          />
          <datalist id="category-list">
            {CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={lbl}>Unit</label>
          <select
            value={form.unit}
            onChange={(e) => set("unit", e.target.value)}
            className={inp}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={lbl}>Tags (comma-separated)</label>
        <input
          value={form.tags}
          onChange={(e) => set("tags", e.target.value)}
          placeholder="e.g. radon, mitigation, fan, sub-slab"
          className={inp}
        />
        <p className="text-xs text-gray-400 mt-1">
          Helps AI pick this preset when keywords are mentioned
        </p>
      </div>
      <div>
        <label className={lbl}>Price Type</label>
        <div className="flex gap-2">
          {(["flat", "hourly"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("price_type", t)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold border transition-colors ${
                form.price_type === t
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-gray-500 border-gray-200"
              }`}
            >
              {t === "flat" ? "Flat Rate" : "Hourly"}
            </button>
          ))}
        </div>
      </div>
      {form.price_type === "flat" ? (
        <div className={grid2}>
          <div>
            <label className={lbl}>Flat Rate ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.flat_rate}
              onChange={(e) => set("flat_rate", e.target.value)}
              placeholder="0.00"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Default Qty</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={form.default_qty}
              onChange={(e) => set("default_qty", e.target.value)}
              className={inp}
            />
          </div>
        </div>
      ) : (
        <div className={grid2}>
          <div>
            <label className={lbl}>Hourly Rate ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.hourly_rate}
              onChange={(e) => set("hourly_rate", e.target.value)}
              placeholder="0.00"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Est. Hours</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.estimated_hours}
              onChange={(e) => set("estimated_hours", e.target.value)}
              placeholder="0"
              className={inp}
            />
          </div>
        </div>
      )}
      <div>
        <label className={lbl}>Material Cost ($)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.material_cost}
          onChange={(e) => set("material_cost", e.target.value)}
          placeholder="Optional"
          className={inp}
        />
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => set("is_active", !form.is_active)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            form.is_active ? "bg-green-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              form.is_active ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </div>
        <span className="text-sm text-slate-700 font-medium">
          {form.is_active ? "Active — used in quotes & AI" : "Inactive — hidden from quotes & AI"}
        </span>
      </label>
    </div>
  );
}

function PresetCard({
  preset,
  onEdited,
}: {
  preset: Preset;
  onEdited: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<PresetForm>(blankForm(preset));
  const [isPending, startTransition] = useTransition();

  const price = effectivePrice(preset);
  const priceLabel =
    preset.price_type === "flat"
      ? `$${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : `$${Number(preset.hourly_rate ?? 0).toFixed(0)}/hr × ${preset.estimated_hours ?? 0}h`;

  function handleToggle() {
    startTransition(async () => {
      await togglePresetActive(preset.id, preset.is_active);
      onEdited();
    });
  }

  function handleSave() {
    if (!form.service_name.trim()) return;
    startTransition(async () => {
      await updatePreset(preset.id, formToData(form));
      setExpanded(false);
      onEdited();
    });
  }

  function handleDelete() {
    if (!confirm(`Remove "${preset.service_name}"?`)) return;
    startTransition(async () => {
      await removePreset(preset.id);
      onEdited();
    });
  }

  return (
    <div
      className={`rounded-xl border-2 overflow-hidden transition-colors ${
        preset.is_active ? "border-gray-100 bg-white" : "border-gray-100 bg-gray-50 opacity-70"
      }`}
    >
      {/* Summary row */}
      <div className="flex items-start gap-3 p-3">
        {/* Active toggle */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className={`mt-0.5 flex-shrink-0 relative w-9 h-5 rounded-full transition-colors ${
            preset.is_active ? "bg-green-500" : "bg-gray-300"
          }`}
          title={preset.is_active ? "Active" : "Inactive"}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              preset.is_active ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-slate-800 leading-tight">
              {preset.service_name}
            </span>
            {preset.category && (
              <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 font-medium leading-none">
                {preset.category}
              </span>
            )}
          </div>
          {preset.description && (
            <p className="text-xs text-gray-500 mt-0.5 leading-tight line-clamp-2">
              {preset.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-bold text-[#1B3A6B]">{priceLabel}</span>
            <span className="text-xs text-gray-400">
              · {preset.unit ?? "each"}
              {preset.default_qty && preset.default_qty !== 1
                ? ` × ${preset.default_qty}`
                : ""}
            </span>
          </div>
          {preset.tags && preset.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {preset.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setForm(blankForm(preset));
              setExpanded((v) => !v);
            }}
            className="text-xs font-medium text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs font-medium text-red-400 px-2 py-1 rounded-lg hover:bg-red-50"
          >
            ×
          </button>
        </div>
      </div>

      {/* Inline edit form */}
      {expanded && (
        <div className="border-t border-gray-100 p-3 bg-blue-50/50 space-y-3">
          <PresetFormFields form={form} onChange={setForm} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || !form.service_name.trim()}
              className="flex-1 rounded-xl py-2.5 text-white text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "#1B3A6B" }}
            >
              {isPending ? "Saving…" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="px-4 rounded-xl py-2.5 text-sm font-medium text-gray-500 bg-white border border-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ServicePresetsManager({ initialPresets }: { initialPresets: Preset[] }) {
  const router = useRouter();
  const [presets, setPresets] = useState<Preset[]>(initialPresets);
  const [showAdd, setShowAdd] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [addForm, setAddForm] = useState<PresetForm>(blankForm());
  const [isPending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function handleAdd() {
    if (!addForm.service_name.trim()) return;
    startTransition(async () => {
      await createPreset(formToData(addForm));
      setAddForm(blankForm());
      setShowAdd(false);
      refresh();
    });
  }

  const active = presets.filter((p) => p.is_active);
  const inactive = presets.filter((p) => !p.is_active);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">
            {active.length} active · {inactive.length} inactive
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowScan(true)}
            className="text-sm font-semibold text-white px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: "#1B3A6B" }}>
            📷 Scan Sheet
          </button>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="text-sm font-semibold text-white px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: "#22C55E" }}>
            {showAdd ? "Cancel" : "+ Add"}
          </button>
        </div>
      </div>

      {showScan && (
        <PriceSheetScanModal
          onClose={() => setShowScan(false)}
          onImported={() => { setShowScan(false); refresh(); }}
        />
      )}

      {/* AI tip */}
      {presets.length === 0 && !showAdd && (
        <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700 space-y-1">
          <p className="font-semibold">No services yet</p>
          <p>
            Add your services and prices here. The AI Job Capture uses this price sheet to build
            accurate drafts — no guessing.
          </p>
        </div>
      )}

      {/* Active presets */}
      {active.length > 0 && (
        <div className="space-y-2">
          {active.map((p) => (
            <PresetCard key={p.id} preset={p} onEdited={refresh} />
          ))}
        </div>
      )}

      {/* Inactive presets */}
      {inactive.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">
            Inactive
          </p>
          {inactive.map((p) => (
            <PresetCard key={p.id} preset={p} onEdited={refresh} />
          ))}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl border-2 border-green-200 bg-green-50/50 p-4 space-y-3">
          <p className="text-sm font-bold text-slate-800">New Service</p>
          <PresetFormFields form={addForm} onChange={setAddForm} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending || !addForm.service_name.trim()}
              className="flex-1 rounded-xl py-2.5 text-white text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "#22C55E" }}
            >
              {isPending ? "Adding…" : "Add Service"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setAddForm(blankForm());
              }}
              className="px-4 rounded-xl py-2.5 text-sm font-medium text-gray-500 bg-white border border-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
