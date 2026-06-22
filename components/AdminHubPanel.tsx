"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BusinessCardScanner } from "@/components/BusinessCardScanner";
import type { CardScanResult } from "@/app/api/ai/card-scan/route";
import { useRouter } from "next/navigation";

/* ── Quick-link tiles ─────────────────────────────────────────────── */
const TILES = [
  { label: "Leads",         href: "/app/leads",          emoji: "📋", bg: "bg-blue-50",   text: "text-blue-700" },
  { label: "Customers",     href: "/app/customers",      emoji: "👤", bg: "bg-slate-50",  text: "text-slate-700" },
  { label: "Schedule",      href: "/app/schedule",       emoji: "📅", bg: "bg-indigo-50", text: "text-indigo-700" },
  { label: "Money",         href: "/app/money",          emoji: "💰", bg: "bg-green-50",  text: "text-green-700" },
  { label: "Expenses",      href: "/app/expenses",       emoji: "💸", bg: "bg-amber-50",  text: "text-amber-700" },
  { label: "Trade Contacts",href: "/app/trade-contacts", emoji: "👷", bg: "bg-orange-50", text: "text-orange-700" },
  { label: "Inventory",     href: "/app/inventory",      emoji: "📦", bg: "bg-brown-50",  text: "text-stone-700" },
  { label: "Activity",      href: "/app/activity",       emoji: "📊", bg: "bg-purple-50", text: "text-purple-700" },
  { label: "Settings",      href: "/app/profile",        emoji: "⚙️", bg: "bg-gray-50",   text: "text-gray-600" },
] as const;

/* ── Card scan save state ─────────────────────────────────────────── */
type CardState = "idle" | "scanning" | "review" | "saving" | "done";

function BottomSheet({ open, onClose, children, title }: {
  open: boolean; onClose: () => void; children: React.ReactNode; title: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl w-full max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 pt-1 shrink-0 border-b border-gray-100">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 pb-8 pt-4">{children}</div>
      </div>
    </div>
  );
}

/* ── Card scan + save flow ────────────────────────────────────────── */
function CardScanSheet({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<CardState>("scanning");
  const [result, setResult] = useState<CardScanResult | null>(null);
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", notes: "" });
  const [saveTarget, setSaveTarget] = useState<"lead" | "contact" | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const router = useRouter();

  function onExtracted(data: CardScanResult) {
    setResult(data);
    setForm({
      name: data.name ?? "",
      company: data.company ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      notes: [data.title, data.website].filter(Boolean).join(" · "),
    });
    setState("review");
  }

  async function save(target: "lead" | "contact") {
    if (!form.name.trim()) { setErr("Name is required"); return; }
    setSaveTarget(target);
    setSaving(true);
    setErr("");
    try {
      if (target === "lead") {
        const res = await fetch("/api/leads/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leads: [{
              name: form.name.trim(),
              phone: form.phone.trim() || undefined,
              email: form.email.trim() || undefined,
              notes: [form.company, form.notes].filter(Boolean).join(" · ") || undefined,
            }],
          }),
        });
        const json = await res.json() as { count?: number; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Failed");
        setDone("Lead added to your pipeline! 🎉");
      } else {
        const res = await fetch("/app/trade-contacts/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            company: form.company.trim() || undefined,
            phone: form.phone.trim() || undefined,
            email: form.email.trim() || undefined,
            notes: form.notes.trim() || undefined,
          }),
        });
        const json = await res.json() as { id?: string; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Failed");
        setDone("Trade contact saved! 🤝");
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center py-10 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">✅</div>
        <p className="text-lg font-bold text-slate-800">{done}</p>
        <button
          onClick={() => { setState("scanning"); setResult(null); setDone(null); setErr(""); }}
          className="w-full rounded-xl py-3 bg-gray-100 text-slate-700 font-semibold">
          Scan Another Card
        </button>
        <button onClick={onClose} className="w-full rounded-xl py-3 text-white font-bold"
          style={{ backgroundColor: "#1B3A6B" }}>
          Done
        </button>
      </div>
    );
  }

  if (state === "review") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Review the info pulled from the card — edit anything that looks off.</p>

        {err && <p className="text-sm text-red-500 font-medium">{err}</p>}

        <div className="space-y-2.5">
          {[
            { label: "Name *", key: "name", type: "text" },
            { label: "Company", key: "company", type: "text" },
            { label: "Phone", key: "phone", type: "tel" },
            { label: "Email", key: "email", type: "email" },
            { label: "Notes", key: "notes", type: "text" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{f.label}</label>
              <input
                type={f.type}
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          ))}
        </div>

        <p className="text-xs font-semibold text-gray-500 uppercase mt-2">Save as</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => save("lead")}
            disabled={saving}
            className="flex flex-col items-center gap-2 rounded-2xl border-2 border-blue-200 bg-blue-50 py-4 font-semibold text-blue-700 text-sm disabled:opacity-50 active:bg-blue-100">
            {saving && saveTarget === "lead"
              ? <span className="w-5 h-5 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
              : <span className="text-2xl">📋</span>}
            Lead
          </button>
          <button
            onClick={() => save("contact")}
            disabled={saving}
            className="flex flex-col items-center gap-2 rounded-2xl border-2 border-orange-200 bg-orange-50 py-4 font-semibold text-orange-700 text-sm disabled:opacity-50 active:bg-orange-100">
            {saving && saveTarget === "contact"
              ? <span className="w-5 h-5 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
              : <span className="text-2xl">👷</span>}
            Trade Contact
          </button>
        </div>

        <button
          onClick={() => { setState("scanning"); setResult(null); }}
          className="w-full text-sm text-gray-400 py-2">
          ← Scan again
        </button>
      </div>
    );
  }

  return (
    <BusinessCardScanner
      onExtracted={onExtracted}
      onCancel={onClose}
    />
  );
}

/* ── Leads import sheet ───────────────────────────────────────────── */
type ImportStep = "idle" | "scanning" | "preview" | "importing" | "done" | "error";
type LeadRow = { name: string; phone?: string; email?: string; address?: string; city?: string; state?: string; job_type?: string };

function LeadsImportSheet({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<ImportStep>("idle");
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [msg, setMsg] = useState("");
  const [count, setCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function reset() { setStep("idle"); setLeads([]); setMsg(""); setCount(0); }

  async function scan(body: { type: "csv"; text: string } | { type: "image"; image_data_url: string }) {
    setStep("scanning");
    try {
      const res = await fetch("/api/leads/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { leads?: LeadRow[]; error?: string };
      if (!res.ok || !json.leads) throw new Error(json.error ?? "Scan failed");
      if (!json.leads.length) throw new Error("No leads found. Make sure it has a Name column.");
      setLeads(json.leads);
      setStep("preview");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong");
      setStep("error");
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    if (file.name.match(/\.(xlsx?|ods)$/i)) { setMsg("Save as CSV first, then upload."); setStep("error"); return; }
    await scan({ type: "csv", text: await file.text() });
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    const reader = new FileReader();
    reader.onload = async ev => { await scan({ type: "image", image_data_url: ev.target?.result as string }); };
    reader.readAsDataURL(file);
  }

  async function confirmImport() {
    setStep("importing");
    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads }),
      });
      const json = await res.json() as { count?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      setCount(json.count ?? leads.length);
      setStep("done");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Import failed");
      setStep("error");
    }
  }

  if (step === "idle") return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-2">Upload a CSV or take a photo of a list — AI reads it automatically.</p>
      <input ref={fileRef}  type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={handleFile} />
      <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
      {[
        { icon: "📄", label: "Upload CSV File", sub: "From Google Sheets, Excel (save as CSV), or any spreadsheet", ref: fileRef },
        { icon: "📷", label: "Take a Photo", sub: "Point at a printed list — AI will read it", ref: photoRef },
      ].map(o => (
        <button key={o.label} onClick={() => o.ref.current?.click()}
          className="flex items-center gap-4 w-full bg-gray-50 rounded-2xl px-4 py-4 text-left active:bg-gray-100">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl shrink-0">{o.icon}</div>
          <div>
            <p className="font-semibold text-slate-800">{o.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{o.sub}</p>
          </div>
        </button>
      ))}
      <div className="mt-3 p-3 bg-amber-50 rounded-xl">
        <p className="text-xs text-amber-700 font-semibold mb-1">CSV tip</p>
        <p className="text-xs text-amber-600">Just needs a Name column. Phone, Email, Address, City, State, and Service Type are picked up automatically.</p>
      </div>
    </div>
  );

  if (step === "scanning") return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      <p className="text-sm font-semibold text-slate-600">Reading your leads…</p>
      <p className="text-xs text-gray-400">This takes a few seconds</p>
    </div>
  );

  if (step === "preview") return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Review — tap × to remove any you don't want.</p>
      <div className="space-y-2">
        {leads.map((lead, i) => (
          <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-800 truncate">{lead.name}</p>
              <div className="flex flex-wrap gap-x-3 mt-0.5">
                {lead.phone && <span className="text-xs text-gray-500">📞 {lead.phone}</span>}
                {lead.email && <span className="text-xs text-gray-500">✉ {lead.email}</span>}
                {(lead.city || lead.state) && <span className="text-xs text-gray-500">📍 {[lead.city, lead.state].filter(Boolean).join(", ")}</span>}
                {lead.job_type && <span className="text-xs text-gray-500">🔧 {lead.job_type}</span>}
              </div>
            </div>
            <button onClick={() => setLeads(p => p.filter((_, j) => j !== i))} className="text-gray-400 text-xl leading-none pt-0.5">×</button>
          </div>
        ))}
      </div>
      {leads.length === 0 && <p className="text-sm text-gray-400 text-center py-4">All leads removed.</p>}
      <button onClick={confirmImport} disabled={!leads.length}
        className="w-full rounded-xl py-3 text-white font-bold disabled:opacity-40"
        style={{ backgroundColor: "#1B3A6B" }}>
        Import {leads.length} Lead{leads.length !== 1 ? "s" : ""}
      </button>
      <button onClick={reset} className="w-full rounded-xl py-3 text-gray-500 font-semibold bg-gray-50">Start Over</button>
    </div>
  );

  if (step === "importing") return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-green-200 border-t-green-600 animate-spin" />
      <p className="text-sm font-semibold text-slate-600">Importing…</p>
    </div>
  );

  if (step === "done") return (
    <div className="flex flex-col items-center py-12 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">✅</div>
      <p className="text-xl font-bold text-slate-800">{count} Lead{count !== 1 ? "s" : ""} Imported</p>
      <p className="text-sm text-gray-400">All in your pipeline as "New".</p>
      <button onClick={onClose} className="w-full rounded-xl py-3 text-white font-bold" style={{ backgroundColor: "#1B3A6B" }}>Done</button>
    </div>
  );

  return (
    <div className="flex flex-col items-center py-8 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-3xl">⚠️</div>
      <p className="font-semibold text-slate-800">Something went wrong</p>
      <p className="text-sm text-gray-500">{msg}</p>
      <button onClick={reset} className="w-full rounded-xl py-3 font-bold bg-gray-100 text-slate-700">Try Again</button>
    </div>
  );
}

/* ── Main AdminHubPanel ───────────────────────────────────────────── */
export function AdminHubPanel() {
  const [sheet, setSheet] = useState<null | "scan" | "import">(null);

  return (
    <div className="space-y-3">
      {/* Capture tools */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Quick Capture</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSheet("scan")}
            className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm text-left active:bg-blue-50">
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-xl shrink-0">📷</div>
            <div>
              <p className="text-sm font-bold text-slate-800">Scan Card</p>
              <p className="text-xs text-gray-400 mt-0.5">Photo → lead or contact</p>
            </div>
          </button>
          <button
            onClick={() => setSheet("import")}
            className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm text-left active:bg-green-50">
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-xl shrink-0">📥</div>
            <div>
              <p className="text-sm font-bold text-slate-800">Import Leads</p>
              <p className="text-xs text-gray-400 mt-0.5">CSV or photo scan</p>
            </div>
          </button>
        </div>
      </div>

      {/* Quick-link grid */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Admin Shortcuts</p>
        <div className="grid grid-cols-3 gap-2">
          {TILES.map(t => (
            <Link key={t.href} href={t.href}
              className={`flex flex-col items-center gap-1.5 rounded-2xl py-3.5 px-2 text-center ${t.bg} active:opacity-80`}>
              <span className="text-2xl leading-none">{t.emoji}</span>
              <span className={`text-xs font-semibold ${t.text}`}>{t.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Card scan sheet */}
      <BottomSheet open={sheet === "scan"} onClose={() => setSheet(null)} title="Scan Business Card">
        {sheet === "scan" && <CardScanSheet onClose={() => setSheet(null)} />}
      </BottomSheet>

      {/* Import leads sheet */}
      <BottomSheet open={sheet === "import"} onClose={() => setSheet(null)} title="Import Leads">
        {sheet === "import" && <LeadsImportSheet onClose={() => setSheet(null)} />}
      </BottomSheet>
    </div>
  );
}
