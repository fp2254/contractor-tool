"use client";

import { useEffect, useState } from "react";

type EntityType = "job" | "lead" | "customer" | "quote" | "invoice";

const ENTITY_TABS: { type: EntityType; label: string; emoji: string }[] = [
  { type: "job",      label: "Job",      emoji: "🔨" },
  { type: "lead",     label: "Lead",     emoji: "🎯" },
  { type: "customer", label: "Customer", emoji: "👤" },
  { type: "quote",    label: "Quote",    emoji: "📋" },
  { type: "invoice",  label: "Invoice",  emoji: "🧾" },
];

type SearchResult = { id: string; label: string; subtitle: string };

type Props = {
  aiRunId: string;
  defaultEntityType?: EntityType;
  defaultEntityId?: string;
  onAttached: () => void;
  onClose: () => void;
};

export function AiAttachModal({ aiRunId, defaultEntityType, defaultEntityId, onAttached, onClose }: Props) {
  const [entityType, setEntityType] = useState<EntityType>(defaultEntityType ?? "job");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [attaching, setAttaching] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(defaultEntityId ?? null);

  useEffect(() => {
    setQ("");
    setSelectedId(defaultEntityId && defaultEntityType === entityType ? defaultEntityId : null);
    fetchEntities("", entityType);
  }, [entityType]);

  async function fetchEntities(query: string, type: EntityType) {
    setLoading(true);
    try {
      const res = await fetch(`/api/entities/search?entity_type=${type}&q=${encodeURIComponent(query)}`);
      const data = await res.json() as SearchResult[];
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleQ(val: string) {
    setQ(val);
    fetchEntities(val, entityType);
  }

  async function attach(entityId: string) {
    setAttaching(entityId);
    try {
      const res = await fetch("/api/ai/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_run_id: aiRunId,
          entity_type: entityType,
          entity_id: entityId,
          title: title.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      onAttached();
      onClose();
    } catch {
      // ignore
    } finally {
      setAttaching(null);
    }
  }

  const displayResults = results.filter(
    (r) => !q || r.label.toLowerCase().includes(q.toLowerCase()) || r.subtitle.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-xl max-h-[85vh] flex flex-col">

        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">Attach to…</h2>
            <p className="text-xs text-gray-400">Choose where to save this AI answer</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">✕</button>
        </div>

        <div className="flex gap-1 px-4 pt-3 pb-1 flex-shrink-0 overflow-x-auto">
          {ENTITY_TABS.map((t) => (
            <button
              key={t.type}
              onClick={() => setEntityType(t.type)}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                entityType === t.type
                  ? "text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
              style={entityType === t.type ? { backgroundColor: "#1B3A6B" } : {}}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <div className="px-4 py-2 flex-shrink-0">
          <input
            placeholder="Optional title for this answer…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 mb-2"
          />
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              placeholder={`Search ${entityType}s…`}
              value={q}
              onChange={(e) => handleQ(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1">
          {loading && (
            <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
          )}
          {!loading && displayResults.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No {entityType}s found.</p>
          )}
          {!loading && displayResults.map((r) => (
            <button
              key={r.id}
              onClick={() => attach(r.id)}
              disabled={attaching === r.id}
              className="w-full text-left rounded-xl p-3 bg-gray-50 hover:bg-blue-50 transition-colors disabled:opacity-50">
              <p className="text-sm font-semibold text-slate-800">
                {attaching === r.id ? "Attaching…" : r.label}
              </p>
              {r.subtitle && <p className="text-xs text-gray-400 mt-0.5">{r.subtitle}</p>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
