import { readFileSync } from "fs";
import { join } from "path";

export default function SetupPage() {
  let sql = "";
  try {
    sql = readFileSync(join(process.cwd(), "supabase/migration_phase1.sql"), "utf-8");
  } catch {
    sql = "-- Migration file not found";
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Database Setup</h1>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Action Required</p>
        <p className="text-sm text-amber-700">
          Some Phase 1 features (Leads, Payments, Notes) require new database tables.
          Copy the SQL below and run it in your Supabase SQL Editor.
        </p>
        <a href="https://supabase.com/dashboard/project/lrtrbocvcqgfnklknlnu/sql"
          target="_blank" rel="noreferrer"
          className="mt-2 inline-block text-sm font-semibold text-[#1B3A6B] underline">
          Open Supabase SQL Editor →
        </a>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-sm font-semibold text-slate-700">migration_phase1.sql</p>
          <p className="text-xs text-gray-400">Copy all → paste → Run in Supabase</p>
        </div>
        <pre className="p-4 text-xs text-slate-700 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto bg-gray-50">
          {sql}
        </pre>
      </div>

      <p className="text-xs text-gray-400 text-center">After running the SQL, all Phase 1 features will be fully active.</p>
    </div>
  );
}
