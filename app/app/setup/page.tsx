import { readFileSync } from "fs";
import { join } from "path";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

function readSql(filename: string) {
  try {
    return readFileSync(join(process.cwd(), `supabase/${filename}`), "utf-8");
  } catch {
    return "-- File not found";
  }
}

async function col(admin: ReturnType<typeof createAdminClient>, table: string, column: string) {
  const { error } = await admin.from(table as "orgs").select(column).limit(1);
  return !error;
}

async function tbl(admin: ReturnType<typeof createAdminClient>, table: string) {
  const { error } = await admin.from(table as "orgs").select("id").limit(1);
  return !error;
}

export default async function SetupPage() {
  await ensureUserOrg();
  const admin = createAdminClient();

  const [hasPortalTokens, hasRevokedAt, hasQuoteId, hasSignatures] = await Promise.all([
    tbl(admin, "customer_portal_tokens"),
    col(admin, "customer_portal_tokens", "revoked_at"),
    col(admin, "customer_portal_tokens", "quote_id"),
    tbl(admin, "quote_signatures"),
  ]);

  const migrations = [
    { title: "Phase 1 — Core tables (leads, payments, notes)", file: "migration_phase1.sql" },
    { title: "Phase 2 — Business profile (org_settings, service_presets)", file: "migration_phase2.sql" },
    { title: "Phase 3 — Photos", file: "migration_photos.sql" },
    { title: "Phase 4 — Customer portal (customer_portal_tokens)", file: "migration_portal.sql" },
    { title: "Phase 5 — AI Presets (service_presets columns)", file: "migration_ai_presets.sql" },
    { title: "Phase 6 — Portal V2 (revoked_at, quote_id, quote_signatures) ← NEW", file: "migration_portal_v2.sql" },
  ];

  const v2Checks = [
    { label: "customer_portal_tokens table", ok: hasPortalTokens },
    { label: "customer_portal_tokens.revoked_at", ok: hasRevokedAt },
    { label: "customer_portal_tokens.quote_id", ok: hasQuoteId },
    { label: "quote_signatures table", ok: hasSignatures },
  ];

  const v2Done = v2Checks.every((c) => c.ok);

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-800">Database Setup</h1>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Portal V2 Status</p>
        {v2Checks.map((c) => (
          <div key={c.label} className="flex items-center gap-3">
            <span className={c.ok ? "text-green-500" : "text-red-500"}>{c.ok ? "✓" : "✗"}</span>
            <span className={`text-sm ${c.ok ? "text-slate-600" : "text-red-600 font-semibold"}`}>{c.label}</span>
          </div>
        ))}
        {v2Done
          ? <p className="text-xs text-green-600 font-semibold mt-2">✅ Portal V2 fully applied.</p>
          : (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <p className="text-xs text-amber-800 font-semibold">Run Phase 6 SQL below in Supabase.</p>
              <a href="https://supabase.com/dashboard/project/lrtrbocvcqgfnklknlnu/sql"
                target="_blank" rel="noreferrer"
                className="text-xs text-[#1B3A6B] underline font-semibold">
                Open Supabase SQL Editor →
              </a>
            </div>
          )
        }
      </div>

      {migrations.map(({ title, file }) => (
        <div key={file} className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-slate-700">{title}</p>
            <span className="text-xs font-mono text-gray-400">{file}</span>
          </div>
          <pre className="p-4 text-xs text-slate-700 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto bg-gray-50">
            {readSql(file)}
          </pre>
        </div>
      ))}

      <p className="text-xs text-gray-400 text-center pb-4">
        Run any missing migrations in Supabase SQL Editor, then reload this page to verify.
      </p>
    </div>
  );
}
