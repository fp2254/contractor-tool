import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { getUserOrgRole, isOwnerOrAdmin } from "@/lib/orgRole";
import { CloseoutClient, type CloseoutPageData, type InvoiceLine } from "./CloseoutClient";

function fillWarrantyTokens(text: string, vars: {
  customer_name: string;
  job_address: string;
  completion_date: string;
  company_name: string;
  job_title: string;
  template_name: string;
}): string {
  return text
    .replace(/\{customer_name\}/g, vars.customer_name)
    .replace(/\{job_address\}/g, vars.job_address)
    .replace(/\{completion_date\}/g, vars.completion_date)
    .replace(/\{company_name\}/g, vars.company_name)
    .replace(/\{job_title\}/g, vars.job_title)
    .replace(/\{template_name\}/g, vars.template_name);
}

export default async function JobCloseoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { role } = await getUserOrgRole();
  const adminUser = isOwnerOrAdmin(role);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (admin as any)
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("org_id", orgId!)
    .single();

  if (!job) return notFound();
  if (!job.template_id) return notFound();
  if (job.status !== "completed") {
    return (
      <div className="p-4">
        <p className="text-gray-500 text-sm">Job must be completed before generating a closeout package.</p>
      </div>
    );
  }

  const templateId = job.template_id as string;

  // Parallel data fetches
  const [
    templateRes,
    fieldsRes,
    responsesRes,
    photosRes,
    notesRes,
    orgRes,
    customerRes,
    reportRes,
    packageRes,
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("job_templates").select("name,warranty_title,warranty_body,allow_tech_send_invoice_warranty").eq("id", templateId).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("job_template_fields").select("id,label,field_type,required,sort_order").eq("template_id", templateId).order("sort_order", { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("job_field_responses").select("field_id,value").eq("job_id", jobId).eq("org_id", orgId!),
    admin.from("photos").select("id,url,filename").eq("entity_type", "job").eq("entity_id", jobId).eq("org_id", orgId!).order("created_at", { ascending: true }),
    admin.from("notes").select("body,created_at").eq("entity_type", "job").eq("entity_id", jobId).eq("org_id", orgId!).order("created_at", { ascending: true }),
    admin.from("orgs").select("business_name").eq("id", orgId!).single(),
    admin.from("customers").select("first_name,last_name,email,phone,city,state").eq("id", job.customer_id).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("job_reports").select("id").eq("job_id", jobId).eq("org_id", orgId!).order("generated_at", { ascending: false }).limit(1).maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("job_closeout_packages").select("*").eq("job_id", jobId).eq("org_id", orgId!).maybeSingle(),
  ]);

  const template = templateRes.data;
  const fields: { id: string; label: string; field_type: string }[] = fieldsRes.data ?? [];
  const responses: { field_id: string; value: string }[] = responsesRes.data ?? [];
  const photos: { url: string; filename: string }[] = photosRes.data ?? [];
  const notes: { body: string }[] = (notesRes.data ?? []).filter((n: { body: string }) => !n.body.startsWith("__") && !n.body.startsWith("⟲"));
  const org = orgRes.data;
  const customer = customerRes.data;
  const report = reportRes.data;
  const pkg = packageRes.data;

  const responseMap = Object.fromEntries(responses.map(r => [r.field_id, r.value]));
  const fieldResponses = fields.map(f => ({
    label: f.label,
    field_type: f.field_type,
    value: responseMap[f.id] ?? "",
  })).filter(f => f.value);

  const customerName = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Customer";
  const businessName = org?.business_name ?? "Your Company";

  const completedDate = job.completed_at
    ? new Date(job.completed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // ── Invoice lines (priority order) ────────────────────────────────────────
  let invoiceLines: InvoiceLine[] = [];
  let invoiceBaseTotal = 0;
  let invoiceSource: CloseoutPageData["invoiceSource"] = "fallback";
  let existingInvoiceId: string | null = null;

  if (job.invoice_id) {
    const { data: invItems } = await admin.from("invoice_items").select("*").eq("invoice_id", job.invoice_id).eq("org_id", orgId!);
    invoiceLines = (invItems ?? []).map(i => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), total: Number(i.total_price) }));
    invoiceBaseTotal = invoiceLines.reduce((s, l) => s + l.total, 0);
    invoiceSource = "existing";
    existingInvoiceId = job.invoice_id;
  } else if (job.quote_id) {
    const { data: qItems } = await admin.from("quote_items").select("*").eq("quote_id", job.quote_id).eq("org_id", orgId!);
    invoiceLines = (qItems ?? []).map(i => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), total: Number(i.total_price) }));
    invoiceBaseTotal = invoiceLines.reduce((s, l) => s + l.total, 0);
    invoiceSource = "quote";
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tmplItems } = await (admin as any).from("job_template_invoice_items").select("*").eq("template_id", templateId).eq("org_id", orgId!).order("sort_order", { ascending: true });
    if (tmplItems?.length > 0) {
      invoiceLines = (tmplItems as { description: string; amount: number }[]).map(i => ({ description: i.description, quantity: 1, unit_price: Number(i.amount), total: Number(i.amount) }));
      invoiceBaseTotal = invoiceLines.reduce((s, l) => s + l.total, 0);
      invoiceSource = "template";
    } else {
      invoiceLines = [{ description: job.job_title, quantity: 1, unit_price: 0, total: 0 }];
      invoiceSource = "fallback";
    }
  }

  // ── Warranty with auto-filled tokens ──────────────────────────────────────
  const rawWarrantyTitle = template?.warranty_title ?? "";
  const rawWarrantyBody = template?.warranty_body ?? "";
  const tokenVars = {
    customer_name: customerName,
    job_address: job.address ?? "",
    completion_date: completedDate,
    company_name: businessName,
    job_title: job.job_title,
    template_name: template?.name ?? "",
  };
  const warrantyTitle = fillWarrantyTokens(rawWarrantyTitle, tokenVars);
  const warrantyBody = fillWarrantyTokens(rawWarrantyBody, tokenVars);

  // ── Permissions ───────────────────────────────────────────────────────────
  const canSend = adminUser || (template?.allow_tech_send_invoice_warranty === true);
  const warrantyLocked = !adminUser;

  // ── Saved draft adjustments ───────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pkgData = (pkg?.package_data ?? {}) as Record<string, any>;
  const savedAdjustments = pkgData.adjustments ?? null;

  const pageData: CloseoutPageData = {
    jobId,
    jobTitle: job.job_title,
    jobAddress: job.address ?? null,
    completedAt: job.completed_at ?? null,
    customerName,
    customerFirstName: customer?.first_name || customerName,
    customerEmail: customer?.email ?? null,
    businessName,
    templateName: template?.name ?? "",
    fieldResponses,
    photos,
    notes: notes.map(n => n.body),
    invoiceLines,
    invoiceBaseTotal,
    invoiceSource,
    existingInvoiceId,
    warrantyTitle,
    warrantyBody,
    warrantyLocked,
    canSend,
    isOwnerOrAdmin: adminUser,
    packageId: pkg?.id ?? null,
    packageStatus: pkg?.status ?? null,
    sentAt: pkg?.sent_at ?? null,
    reportId: report?.id ?? null,
    savedAdjustments: savedAdjustments ?? null,
    savedWarrantyTitle: pkg?.warranty_title ?? null,
    savedWarrantyBody: pkg?.warranty_body ?? null,
  };

  return <CloseoutClient data={pageData} />;
}
