import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { getUserOrgRole, isOwnerOrAdmin } from "@/lib/orgRole";
import { getResendClient, closeoutEmailHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { role } = await getUserOrgRole();

  const body = await req.json() as {
    warranty_title: string;
    warranty_body: string;
    adjustments: {
      discount: number;
      addon_charge: number;
      addon_desc: string;
      customer_note: string;
      internal_note: string;
    };
    invoice_lines: { description: string; quantity: number; unit_price: number; total: number }[];
    invoice_base_total: number;
    report_id?: string | null;
    invoice_id?: string | null;
  };

  // ── Fetch job + template ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (admin as any)
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("org_id", orgId!)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: template } = await (admin as any)
    .from("job_templates")
    .select("allow_tech_send_invoice_warranty,name")
    .eq("id", job.template_id)
    .single();

  const canSend = isOwnerOrAdmin(role) || (template?.allow_tech_send_invoice_warranty === true);
  if (!canSend) {
    return NextResponse.json({ error: "You don't have permission to send closeout packages" }, { status: 403 });
  }

  // ── Fetch customer + org ───────────────────────────────────────────────────
  const [customerRes, orgRes] = await Promise.all([
    admin.from("customers").select("*").eq("id", job.customer_id).single(),
    admin.from("orgs").select("business_name,phone").eq("id", orgId!).single(),
  ]);

  const customer = customerRes.data;
  const org = orgRes.data;

  if (!customer?.email) {
    return NextResponse.json({ error: "Customer has no email address on file" }, { status: 400 });
  }

  const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer";
  const businessName = org?.business_name ?? "Your Contractor";

  // ── Compute effective total ────────────────────────────────────────────────
  const adj = body.adjustments;
  const effectiveTotal = Math.max(0, body.invoice_base_total - (adj.discount ?? 0) + (adj.addon_charge ?? 0));

  const completedDate = job.completed_at
    ? new Date(job.completed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // ── Send email ─────────────────────────────────────────────────────────────
  const { client, fromEmail } = await getResendClient();

  const invoiceLinesForEmail = [
    ...body.invoice_lines.map(l => ({ description: l.description, quantity: l.quantity, total: l.total })),
    ...(adj.addon_charge > 0 ? [{ description: adj.addon_desc || "Additional charge", quantity: 1, total: adj.addon_charge }] : []),
    ...(adj.discount > 0 ? [{ description: "Discount", quantity: 1, total: -adj.discount }] : []),
  ];

  const { error: sendError } = await client.emails.send({
    from: `${businessName} <${fromEmail}>`,
    to: [customer.email],
    subject: `Job Complete — ${job.job_title} from ${businessName}`,
    html: closeoutEmailHtml({
      businessName,
      customerFirstName: customer.first_name || customerName,
      jobTitle: job.job_title,
      jobAddress: job.address ?? null,
      completedDate,
      invoiceLines: invoiceLinesForEmail,
      effectiveTotal,
      customerNote: adj.customer_note || null,
      warrantyTitle: body.warranty_title,
      warrantyBody: body.warranty_body,
    }),
  });

  if (sendError) {
    console.error("Resend closeout error:", sendError);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  // ── Upsert closeout package as sent ───────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from("job_closeout_packages")
    .select("id")
    .eq("job_id", jobId)
    .eq("org_id", orgId!)
    .maybeSingle();

  const pkgRow = {
    org_id: orgId!,
    job_id: jobId,
    report_id: body.report_id ?? null,
    invoice_id: body.invoice_id ?? null,
    warranty_title: body.warranty_title,
    warranty_body: body.warranty_body,
    package_data: {
      adjustments: body.adjustments,
      invoice_lines: body.invoice_lines,
      invoice_base_total: body.invoice_base_total,
      effective_total: effectiveTotal,
      sent_to_email: customer.email,
    },
    status: "sent",
    sent_by: user?.id ?? null,
    sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("job_closeout_packages").update(pkgRow).eq("id", existing.id);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("job_closeout_packages").insert(pkgRow);
  }

  return NextResponse.json({ ok: true, sentTo: customer.email });
}
