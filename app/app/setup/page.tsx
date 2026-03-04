import { readFileSync } from "fs";
import { join } from "path";

function readSql(filename: string) {
  try {
    return readFileSync(join(process.cwd(), `supabase/${filename}`), "utf-8");
  } catch {
    return "-- File not found";
  }
}

export default function SetupPage() {
  const phase1 = readSql("migration_phase1.sql");
  const phase2 = readSql("migration_phase2.sql");

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Database Setup</h1>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Run Both Migrations</p>
        <p className="text-sm text-amber-700">
          Copy each SQL block below and run it in your Supabase SQL Editor.
        </p>
        <a href="https://supabase.com/dashboard/project/lrtrbocvcqgfnklknlnu/sql"
          target="_blank" rel="noreferrer"
          className="mt-2 inline-block text-sm font-semibold text-[#1B3A6B] underline">
          Open Supabase SQL Editor →
        </a>
      </div>

      {[
        { title: "Phase 1 — Leads, Payments, Notes", sql: phase1 },
        { title: "Phase 2 — Business Profile (org_settings, service_presets)", sql: phase2 },
      ].map(({ title, sql }) => (
        <div key={title} className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="text-sm font-semibold text-slate-700">{title}</p>
          </div>
          <pre className="p-4 text-xs text-slate-700 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto bg-gray-50">
            {sql}
          </pre>
        </div>
      ))}

      <p className="text-xs text-gray-400 text-center">After running both migrations, all features will be fully active.</p>
    </div>
  );
}
