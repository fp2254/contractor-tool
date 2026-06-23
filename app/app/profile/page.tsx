import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import {
  saveQuoteDefaults,
  saveInvoiceDefaults,
  savePaymentSettings,
  saveAutomation,
} from "./actions";
import { ServicePresetsManager } from "@/components/ServicePresetsManager";
import { BusinessIdentityForm, type BusinessIdentityData } from "@/components/BusinessIdentityForm";
import { DefaultWarrantyForm } from "@/components/DefaultWarrantyForm";
import { PublicProfileCard } from "./PublicProfileCard";
import PriceSheetScanner from "@/components/PriceSheetScanner";
import { AiAssistantSettings } from "@/components/AiAssistantSettings";

const inputCls = "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white";
const labelCls = "block text-xs font-semibold text-gray-500 uppercase mb-1";
const gridCls = "grid grid-cols-2 gap-3";
const saveBtnCls = "w-full rounded-xl py-2.5 text-white text-sm font-semibold mt-4";

function Section({ title, emoji, children, open }: { title: string; emoji: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="bg-white rounded-2xl shadow-sm overflow-hidden" open={open}>
      <summary className="flex items-center gap-3 px-4 py-4 cursor-pointer select-none list-none">
        <span className="text-xl">{emoji}</span>
        <span className="flex-1 font-semibold text-slate-800">{title}</span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400 details-chevron" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-4 pb-4 border-t border-gray-100 pt-4">{children}</div>
    </details>
  );
}

export default async function ProfilePage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [{ data: org }, { data: settings }, { data: presets }, { data: pubProfile }] = await Promise.all([
    admin.from("orgs").select("*").eq("id", orgId!).single(),
    admin.from("org_settings").select("*").eq("org_id", orgId!).maybeSingle(),
    admin.from("service_presets").select("*").eq("org_id", orgId!).order("created_at", { ascending: true }),
    (async () => { try { return await (admin as any).from("public_profiles").select("slug,is_published").eq("org_id", orgId!).maybeSingle(); } catch { return { data: null }; } })(),
  ]);

  const s = settings ?? {};
  const methods = ((s as any).accepted_payment_methods ?? "cash,check,card").split(",").map((m: string) => m.trim()).filter(Boolean);
  const followupDays = ((s as any).quote_followup_days ?? "3,7").split(",").map((d: string) => d.trim()).filter(Boolean);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/app/more" className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-slate-800">Settings</h1>
      </div>

      {/* ── Public Profile ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <span className="text-xl">🌐</span>
          <span className="flex-1 font-semibold text-slate-800">Public Profile</span>
          {pubProfile?.is_published && (
            <span className="text-[11px] font-bold bg-green-100 text-green-700 rounded-full px-2.5 py-0.5">Live</span>
          )}
        </div>
        <div className="px-4 pb-4 pt-4">
          <PublicProfileCard initialProfile={pubProfile ?? null} />
        </div>
      </div>

      {/* ── Business Identity ── */}
      <Section title="Business Identity" emoji="🏢" open>
        <BusinessIdentityForm initial={{
          business_name: org?.name ?? "",
          dba_name: (s as any).dba_name ?? "",
          primary_phone: (s as any).primary_phone ?? "",
          business_email: (s as any).business_email ?? "",
          website: (s as any).website ?? "",
          address: (s as any).address ?? "",
          city: (s as any).city ?? "",
          state: (s as any).state ?? "",
          zip: (s as any).zip ?? "",
          license_number: (s as any).license_number ?? "",
          insurance_number: (s as any).insurance_number ?? "",
          epa_cert_number: (s as any).epa_cert_number ?? "",
          service_area: (s as any).service_area ?? "",
          owner_name: (s as any).owner_name ?? "",
          owner_title: (s as any).owner_title ?? "",
          signature_footer: (s as any).signature_footer ?? "",
          logo_url: (s as any).logo_url ?? "",
        } satisfies BusinessIdentityData} />
      </Section>

      {/* ── Quote Defaults ── */}
      <Section title="Quote Defaults" emoji="📋">
        <form action={saveQuoteDefaults} className="space-y-3">
          <div className={gridCls}>
            <div>
              <label className={labelCls}>Expiration (days)</label>
              <input name="quote_expiration_days" type="number" min={1}
                defaultValue={(s as any).quote_expiration_days ?? 14} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Default Status</label>
              <select name="quote_default_status" defaultValue={(s as any).quote_default_status ?? "draft"} className={inputCls}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Quote Number Format</label>
            <input name="quote_number_format" defaultValue={(s as any).quote_number_format ?? "QUO-{N}"}
              placeholder="QUO-{N}" className={inputCls} />
            <p className="text-xs text-gray-400 mt-1">Use &#123;N&#125; for auto-increment</p>
          </div>
          <div>
            <label className={labelCls}>Default Notes Template</label>
            <textarea name="quote_notes_template" rows={3}
              defaultValue={(s as any).quote_notes_template ?? ""}
              placeholder="This estimate includes all materials and labor necessary to complete the work described."
              className={inputCls} />
          </div>
          <div className={gridCls}>
            <div>
              <label className={labelCls}>Tax Rate (%)</label>
              <input name="default_tax_rate" type="number" step="0.01" min={0}
                defaultValue={(s as any).default_tax_rate ?? 0} className={inputCls} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input name="tax_applied_auto" type="checkbox"
                  defaultChecked={(s as any).tax_applied_auto ?? false}
                  className="h-4 w-4 rounded accent-blue-700" />
                <span className="text-sm text-slate-700">Auto-apply tax</span>
              </label>
            </div>
          </div>
          <div>
            <label className={labelCls}>Deposit Type</label>
            <select name="deposit_type" defaultValue={(s as any).deposit_type ?? "none"} className={inputCls}>
              <option value="none">No Deposit</option>
              <option value="flat">Flat Amount ($)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Deposit Amount / %</label>
            <input name="deposit_value" type="number" step="0.01" min={0}
              defaultValue={(s as any).deposit_value ?? ""} placeholder="0" className={inputCls} />
          </div>
          <button type="submit" className={saveBtnCls} style={{ backgroundColor: "#1B3A6B" }}>Save Quote Defaults</button>
        </form>
      </Section>

      {/* ── Invoice Defaults ── */}
      <Section title="Invoice Defaults" emoji="💵">
        <form action={saveInvoiceDefaults} className="space-y-3">
          <div>
            <label className={labelCls}>Payment Terms</label>
            <select name="payment_terms" defaultValue={(s as any).payment_terms ?? "net14"} className={inputCls}>
              <option value="receipt">Due on Receipt</option>
              <option value="net7">Net 7</option>
              <option value="net14">Net 14</option>
              <option value="net30">Net 30</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Invoice Number Format</label>
            <input name="invoice_number_format" defaultValue={(s as any).invoice_number_format ?? "INV-{N}"}
              placeholder="INV-{N}" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Invoice Footer</label>
            <textarea name="invoice_footer_template" rows={3}
              defaultValue={(s as any).invoice_footer_template ?? ""}
              placeholder="Payment due upon receipt. Thank you for your business."
              className={inputCls} />
          </div>
          <div className={gridCls}>
            <div>
              <label className={labelCls}>Late Fee (%)</label>
              <input name="late_fee_percentage" type="number" step="0.01" min={0}
                defaultValue={(s as any).late_fee_percentage ?? ""} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Grace Period (days)</label>
              <input name="late_fee_grace_days" type="number" min={0}
                defaultValue={(s as any).late_fee_grace_days ?? ""} placeholder="0" className={inputCls} />
            </div>
          </div>
          <button type="submit" className={saveBtnCls} style={{ backgroundColor: "#1B3A6B" }}>Save Invoice Defaults</button>
        </form>
      </Section>

      {/* ── Default Warranty ── */}
      <Section title="Default Warranty & Terms" emoji="📜">
        <DefaultWarrantyForm initialText={(s as any).default_warranty_text ?? ""} />
      </Section>

      {/* ── Service Presets ── */}
      <Section title="Service Pricing Presets" emoji="⚡">
        <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700">
          <span className="font-semibold">Job Capture uses this price sheet.</span> Active services are matched to job descriptions — no guessing.
        </div>
        <div className="mb-5">
          <PriceSheetScanner />
        </div>
        <ServicePresetsManager initialPresets={presets ?? []} />
      </Section>

      {/* ── Payment Settings ── */}
      <Section title="Payment Settings" emoji="💳">
        <form action={savePaymentSettings} className="space-y-3">
          <div>
            <label className={labelCls}>Accepted Payment Methods</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {["cash","check","card","venmo","paypal","other"].map(m => (
                <label key={m} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input type="checkbox" name="accepted_payment_methods" value={m}
                    defaultChecked={methods.includes(m)}
                    className="h-4 w-4 rounded accent-blue-700" />
                  <span className="capitalize">{m}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Payment Instructions</label>
            <textarea name="payment_instructions" rows={3}
              defaultValue={(s as any).payment_instructions ?? ""}
              placeholder="Checks payable to…"
              className={inputCls} />
          </div>
          <button type="submit" className={saveBtnCls} style={{ backgroundColor: "#1B3A6B" }}>Save Payment Settings</button>
        </form>
      </Section>

      {/* ── Automation ── */}
      <Section title="Automation" emoji="🤖">
        <form action={saveAutomation} className="space-y-4">
          <div>
            <label className={labelCls}>Quote Follow-Up Days</label>
            <div className="flex gap-4 mt-1">
              {["3","7","14"].map(d => (
                <label key={d} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input type="checkbox" name="quote_followup_days" value={d}
                    defaultChecked={followupDays.includes(d)}
                    className="h-4 w-4 rounded accent-blue-700" />
                  {d} days
                </label>
              ))}
            </div>
          </div>
          <div className={gridCls}>
            <div>
              <label className={labelCls}>Invoice Reminder Before Due (days)</label>
              <input name="invoice_reminder_before" type="number" min={0}
                defaultValue={(s as any).invoice_reminder_before ?? ""}
                placeholder="e.g. 2" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Reminder After Due (days)</label>
              <input name="invoice_reminder_after" type="number" min={0}
                defaultValue={(s as any).invoice_reminder_after ?? ""}
                placeholder="e.g. 3" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Quote Sent Message</label>
            <textarea name="quote_sent_template" rows={3}
              defaultValue={(s as any).quote_sent_template ?? ""}
              placeholder="Your estimate is ready. Please review and let us know if you have questions."
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Invoice Reminder Message</label>
            <textarea name="invoice_reminder_template" rows={3}
              defaultValue={(s as any).invoice_reminder_template ?? ""}
              placeholder="This is a friendly reminder that invoice payment is due."
              className={inputCls} />
          </div>
          <button type="submit" className={saveBtnCls} style={{ backgroundColor: "#1B3A6B" }}>Save Automation</button>
        </form>
      </Section>

      {/* ── AI Assistant ── */}
      <Section title="AI Assistant" emoji="🤖">
        <div className="bg-amber-50 rounded-xl p-3 mb-4 text-xs text-amber-700">
          <span className="font-semibold">AI-powered lead response.</span> The assistant texts new leads instantly, qualifies them, and books appointments — using only the info you configure here.
        </div>
        <AiAssistantSettings presets={presets ?? []} />
      </Section>

      {/* ── Data Export ── */}
      <Section title="Data Export" emoji="📤">
        <div className="space-y-2">
          {[
            { label: "Export Customers (CSV)", href: "/api/export/customers" },
            { label: "Export Quotes (CSV)", href: "/api/export/quotes" },
            { label: "Export Invoices (CSV)", href: "/api/export/invoices" },
          ].map(({ label, href }) => (
            <a key={href} href={href}
              className="flex items-center justify-between w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-slate-700 bg-gray-50">
              {label}
              <span className="text-gray-400">↓</span>
            </a>
          ))}
        </div>
      </Section>

      {/* ── Team Members ── */}
      <Section title="Team Members" emoji="👥">
        <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
          Team management is coming soon. You will be able to invite Admins, Technicians, and Office Staff with custom permissions.
        </div>
      </Section>

      {/* ── Danger Zone ── */}
      <Section title="Danger Zone" emoji="⚠️">
        <div className="space-y-3">
          <p className="text-sm text-gray-500">These actions are permanent and cannot be undone.</p>
          <button disabled
            className="w-full rounded-xl py-2.5 text-sm font-semibold border border-red-200 text-red-400 bg-red-50 opacity-60 cursor-not-allowed">
            Delete Organization (Contact Support)
          </button>
        </div>
      </Section>

      <div className="h-6" />
    </div>
  );
}
