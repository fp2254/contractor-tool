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

  const [
    hasPortalTokens, hasRevokedAt, hasQuoteId, hasSignatures,
    hasAiRuns, hasAiAttachments,
    hasInventory, hasTradeContacts,
    hasSquare,
    hasOrgAddons, hasExternalSubId, hasBillingProvider,
    hasOrgPhoneNumbers, hasOrgPhoneSettings, hasCallLogs, hasCallTranscripts,
  ] = await Promise.all([
    tbl(admin, "customer_portal_tokens"),
    col(admin, "customer_portal_tokens", "revoked_at"),
    col(admin, "customer_portal_tokens", "quote_id"),
    tbl(admin, "quote_signatures"),
    tbl(admin, "ai_runs"),
    tbl(admin, "ai_attachments"),
    tbl(admin, "inventory_items"),
    tbl(admin, "trade_contacts"),
    col(admin, "org_settings", "square_access_token"),
    tbl(admin, "org_addons"),
    col(admin, "org_addons", "external_subscription_id"),
    col(admin, "org_addons", "billing_provider"),
    tbl(admin, "org_phone_numbers"),
    tbl(admin, "org_phone_settings"),
    tbl(admin, "call_logs"),
    tbl(admin, "call_transcripts"),
  ]);

  const migrations = [
    { title: "Phase 1 — Core tables (leads, payments, notes)", file: "migration_phase1.sql" },
    { title: "Phase 2 — Business profile (org_settings, service_presets)", file: "migration_phase2.sql" },
    { title: "Phase 3 — Photos", file: "migration_photos.sql" },
    { title: "Phase 4 — Customer portal (customer_portal_tokens)", file: "migration_portal.sql" },
    { title: "Phase 5 — AI Presets (service_presets columns)", file: "migration_ai_presets.sql" },
    { title: "Phase 6 — Portal V2 (revoked_at, quote_id, quote_signatures)", file: "migration_portal_v2.sql" },
    { title: "Phase 7 — AI Answer Attachments (ai_runs, ai_attachments)", file: "migration_ai_attachments.sql" },
    { title: "Phase 8 — Inventory (inventory_items)", file: "migration_inventory.sql" },
    { title: "Phase 9 — Trade Contacts (trade_contacts)", file: "migration_trade_contacts.sql" },
    { title: "Phase 10 — Square OAuth (org_settings columns)", file: "migration_square.sql" },
    { title: "Phase 11 — Add-on Subscriptions (org_addons)", file: "migration_addons.sql" },
    { title: "Phase 11b — Add-on Billing Columns (external_subscription_id, billing_provider)", file: "migration_addons_v2.sql" },
    { title: "Phase 12 — Phone System (org_phone_numbers, org_phone_settings, call_logs, call_transcripts)", file: "migration_phone_system.sql" },
  ];

  type Check = { label: string; ok: boolean };

  const statusGroups: { title: string; pending: boolean; checks: Check[] }[] = [
    {
      title: "Portal V2",
      pending: !(hasPortalTokens && hasRevokedAt && hasQuoteId && hasSignatures),
      checks: [
        { label: "customer_portal_tokens table", ok: hasPortalTokens },
        { label: "customer_portal_tokens.revoked_at", ok: hasRevokedAt },
        { label: "customer_portal_tokens.quote_id", ok: hasQuoteId },
        { label: "quote_signatures table", ok: hasSignatures },
      ],
    },
    {
      title: "AI Answer Attachments",
      pending: !(hasAiRuns && hasAiAttachments),
      checks: [
        { label: "ai_runs table", ok: hasAiRuns },
        { label: "ai_attachments table", ok: hasAiAttachments },
      ],
    },
    {
      title: "Inventory",
      pending: !hasInventory,
      checks: [
        { label: "inventory_items table", ok: hasInventory },
      ],
    },
    {
      title: "Trade Contacts",
      pending: !hasTradeContacts,
      checks: [
        { label: "trade_contacts table", ok: hasTradeContacts },
      ],
    },
    {
      title: "Square OAuth",
      pending: !hasSquare,
      checks: [
        { label: "org_settings.square_access_token", ok: hasSquare },
      ],
    },
    {
      title: "Add-on Subscriptions (Phone gating)",
      pending: !(hasOrgAddons && hasExternalSubId && hasBillingProvider),
      checks: [
        { label: "org_addons table", ok: hasOrgAddons },
        { label: "org_addons.external_subscription_id", ok: hasExternalSubId },
        { label: "org_addons.billing_provider", ok: hasBillingProvider },
      ],
    },
    {
      title: "Phone System",
      pending: !(hasOrgPhoneNumbers && hasOrgPhoneSettings && hasCallLogs && hasCallTranscripts),
      checks: [
        { label: "org_phone_numbers table", ok: hasOrgPhoneNumbers },
        { label: "org_phone_settings table", ok: hasOrgPhoneSettings },
        { label: "call_logs table", ok: hasCallLogs },
        { label: "call_transcripts table", ok: hasCallTranscripts },
      ],
    },
  ];

  const anyPending = statusGroups.some((g) => g.pending);

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-800">Database Setup</h1>

      {anyPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <p className="text-sm font-bold text-amber-800 mb-1">⚠️ Pending migrations</p>
          <p className="text-xs text-amber-700 mb-2">Run the SQL below for any missing items in the Supabase SQL Editor.</p>
          <a
            href="https://supabase.com/dashboard/project/lrtrbocvcqgfnklknlnu/sql"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#1B3A6B] underline font-semibold">
            Open Supabase SQL Editor →
          </a>
        </div>
      )}

      {statusGroups.map((group) => (
        <div key={group.title} className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{group.title}</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${group.pending ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
              {group.pending ? "Pending" : "✓ Applied"}
            </span>
          </div>
          {group.checks.map((c) => (
            <div key={c.label} className="flex items-center gap-3">
              <span className={c.ok ? "text-green-500" : "text-red-500"}>{c.ok ? "✓" : "✗"}</span>
              <span className={`text-sm ${c.ok ? "text-slate-600" : "text-red-600 font-semibold"}`}>{c.label}</span>
            </div>
          ))}
        </div>
      ))}

      <div className="space-y-4">
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
      </div>

      <p className="text-xs text-gray-400 text-center pb-4">
        Run any missing migrations in Supabase SQL Editor, then reload this page to verify.
      </p>
    </div>
  );
}
