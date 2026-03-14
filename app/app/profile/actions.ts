"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

async function upsertSettings(orgId: string, data: Record<string, unknown>) {
  const admin = createAdminClient();
  await admin
    .from("org_settings")
    .upsert({ org_id: orgId, ...data, updated_at: new Date().toISOString() }, { onConflict: "org_id" });
  revalidatePath("/app/profile");
}

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}
function num(v: FormDataEntryValue | null): number | null {
  const n = parseFloat(String(v ?? ""));
  return isNaN(n) ? null : n;
}
function int(v: FormDataEntryValue | null): number | null {
  const n = parseInt(String(v ?? ""), 10);
  return isNaN(n) ? null : n;
}

export async function saveBusinessIdentity(formData: FormData) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  await admin.from("orgs").update({ name: String(formData.get("business_name") ?? "").trim() || undefined }).eq("id", orgId!);

  await upsertSettings(orgId!, {
    dba_name: str(formData.get("dba_name")),
    primary_phone: str(formData.get("primary_phone")),
    business_email: str(formData.get("business_email")),
    website: str(formData.get("website")),
    address: str(formData.get("address")),
    city: str(formData.get("city")),
    state: str(formData.get("state")),
    zip: str(formData.get("zip")),
    license_number: str(formData.get("license_number")),
    insurance_number: str(formData.get("insurance_number")),
    epa_cert_number: str(formData.get("epa_cert_number")),
    service_area: str(formData.get("service_area")),
    owner_name: str(formData.get("owner_name")),
    owner_title: str(formData.get("owner_title")),
    signature_footer: str(formData.get("signature_footer")),
  });
}

export async function saveQuoteDefaults(formData: FormData) {
  const orgId = await ensureUserOrg();
  await upsertSettings(orgId!, {
    quote_expiration_days: int(formData.get("quote_expiration_days")) ?? 14,
    quote_default_status: str(formData.get("quote_default_status")) ?? "draft",
    quote_notes_template: str(formData.get("quote_notes_template")),
    quote_number_format: str(formData.get("quote_number_format")) ?? "QUO-{N}",
    default_tax_rate: num(formData.get("default_tax_rate")) ?? 0,
    tax_applied_auto: formData.get("tax_applied_auto") === "on",
    deposit_type: str(formData.get("deposit_type")) ?? "none",
    deposit_value: num(formData.get("deposit_value")),
  });
}

export async function saveInvoiceDefaults(formData: FormData) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const paymentTerms = str(formData.get("payment_terms")) ?? "net14";
  const termsMap: Record<string, number> = {
    receipt: 0, net7: 7, net14: 14, net30: 30,
  };
  await admin.from("orgs").update({ default_payment_terms_days: termsMap[paymentTerms] ?? 14 }).eq("id", orgId!);

  await upsertSettings(orgId!, {
    payment_terms: paymentTerms,
    invoice_number_format: str(formData.get("invoice_number_format")) ?? "INV-{N}",
    invoice_footer_template: str(formData.get("invoice_footer_template")),
    late_fee_percentage: num(formData.get("late_fee_percentage")),
    late_fee_grace_days: int(formData.get("late_fee_grace_days")),
  });
}

export async function savePaymentSettings(formData: FormData) {
  const orgId = await ensureUserOrg();
  const methods = formData.getAll("accepted_payment_methods").map(String).join(",");
  await upsertSettings(orgId!, {
    accepted_payment_methods: methods || "cash",
    payment_instructions: str(formData.get("payment_instructions")),
  });
}

export async function saveAutomation(formData: FormData) {
  const orgId = await ensureUserOrg();
  const followupDays = formData.getAll("quote_followup_days").map(String).join(",");
  await upsertSettings(orgId!, {
    quote_followup_days: followupDays || null,
    invoice_reminder_before: int(formData.get("invoice_reminder_before")),
    invoice_reminder_after: int(formData.get("invoice_reminder_after")),
    quote_sent_template: str(formData.get("quote_sent_template")),
    invoice_reminder_template: str(formData.get("invoice_reminder_template")),
  });
}

export type PresetData = {
  service_name: string;
  description: string;
  price_type: "flat" | "hourly";
  flat_rate: number | null;
  hourly_rate: number | null;
  estimated_hours: number | null;
  material_cost: number | null;
  unit: string;
  default_qty: number;
  category: string;
  tags: string[];
  is_active: boolean;
};

export async function createPreset(data: PresetData): Promise<void> {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  await admin.from("service_presets").insert({
    org_id: orgId!,
    service_name: data.service_name.trim(),
    description: data.description.trim() || null,
    price_type: data.price_type,
    flat_rate: data.flat_rate,
    hourly_rate: data.hourly_rate,
    estimated_hours: data.estimated_hours,
    material_cost: data.material_cost,
    unit: data.unit || "each",
    default_qty: data.default_qty || 1,
    category: data.category.trim() || null,
    tags: data.tags.filter(Boolean),
    is_active: data.is_active,
  });
  revalidatePath("/app/profile");
  revalidatePath("/app/quotes/new");
}

export async function updatePreset(id: string, data: PresetData): Promise<void> {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  await admin
    .from("service_presets")
    .update({
      service_name: data.service_name.trim(),
      description: data.description.trim() || null,
      price_type: data.price_type,
      flat_rate: data.flat_rate,
      hourly_rate: data.hourly_rate,
      estimated_hours: data.estimated_hours,
      material_cost: data.material_cost,
      unit: data.unit || "each",
      default_qty: data.default_qty || 1,
      category: data.category.trim() || null,
      tags: data.tags.filter(Boolean),
      is_active: data.is_active,
    })
    .eq("id", id)
    .eq("org_id", orgId!);
  revalidatePath("/app/profile");
  revalidatePath("/app/quotes/new");
}

export async function togglePresetActive(id: string, currentValue: boolean): Promise<void> {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  await admin
    .from("service_presets")
    .update({ is_active: !currentValue })
    .eq("id", id)
    .eq("org_id", orgId!);
  revalidatePath("/app/profile");
  revalidatePath("/app/quotes/new");
}

export async function removePreset(id: string): Promise<void> {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  await admin.from("service_presets").delete().eq("id", id).eq("org_id", orgId!);
  revalidatePath("/app/profile");
  revalidatePath("/app/quotes/new");
}

export async function addServicePreset(formData: FormData) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  await admin.from("service_presets").insert({
    org_id: orgId!,
    service_name: String(formData.get("service_name") ?? "").trim(),
    description: str(formData.get("description")),
    price_type: str(formData.get("price_type")) ?? "flat",
    flat_rate: num(formData.get("flat_rate")),
    hourly_rate: num(formData.get("hourly_rate")),
    estimated_hours: num(formData.get("estimated_hours")),
    material_cost: num(formData.get("material_cost")),
  });
  revalidatePath("/app/profile");
}

export async function deleteServicePreset(formData: FormData) {
  const orgId = await ensureUserOrg();
  const id = String(formData.get("id"));
  const admin = createAdminClient();
  await admin.from("service_presets").delete().eq("id", id).eq("org_id", orgId!);
  revalidatePath("/app/profile");
}

export interface BulkPresetItem {
  service_name: string;
  description?: string;
  price_type: "flat" | "hourly";
  flat_rate: number | null;
  hourly_rate: number | null;
  unit: string;
  category: string;
}

export async function bulkCreatePresets(items: BulkPresetItem[]): Promise<void> {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const rows = items
    .filter((i) => i.service_name.trim())
    .map((i) => ({
      org_id: orgId!,
      service_name: i.service_name.trim(),
      description: i.description?.trim() || null,
      price_type: i.price_type,
      flat_rate: i.flat_rate,
      hourly_rate: i.hourly_rate,
      unit: i.unit || "job",
      default_qty: 1,
      category: i.category?.trim() || null,
      tags: [],
      is_active: true,
    }));
  if (rows.length === 0) return;
  await admin.from("service_presets").insert(rows);
  revalidatePath("/app/profile");
  revalidatePath("/app/quotes/new");
}
