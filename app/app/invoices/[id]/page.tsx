import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import { PhotoGallery } from "@/components/PhotoGallery";
import { EntityAiSection, type AiAttachment } from "@/components/EntityAiSection";
import { ShareCard } from "@/components/ShareCard";
import { WarrantyCard } from "@/components/WarrantyCard";

const STATUS_COLORS: Record<string, string> = {
  unpaid: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};

async function markPaid(formData: FormData) {
  "use server";
  const invoiceId = String(formData.get("invoice_id"));
  const method = String(formData.get("payment_method") ?? "cash");
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data: invoice } = await admin.from("invoices").select("customer_id,total_amount").eq("id", invoiceId).eq("org_id", orgId!).single();
  if (!invoice) return;

  await Promise.all([
    admin.from("invoices").update({ status: "paid" }).eq("id", invoiceId).eq("org_id", orgId!),
    admin.from("payments").insert({
      org_id: orgId!,
      invoice_id: invoiceId,
      customer_id: invoice.customer_id,
      amount: invoice.total_amount,
      payment_method: method as any,
      payment_date: new Date().toISOString().slice(0, 10),
      created_by_user: user.data.user?.id ?? null,
    }),
  ]);

  revalidatePath(`/app/invoices/${invoiceId}`);
}

async function addNote(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const body = String(formData.get("body"));
  if (!body.trim()) return;
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const admin = createAdminClient();
  await admin.from("notes").insert({
    org_id: orgId!,
    entity_type: "invoice",
    entity_id: id,
    body: body.trim(),
    created_by: user.data.user?.id ?? null,
  });
  revalidatePath(`/app/invoices/${id}`);
}

async function saveWarrantyNote(invoiceId: string, warrantyText: string | null) {
  "use server";
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  await (admin as any)
    .from("notes")
    .delete()
    .eq("org_id", orgId!)
    .eq("entity_type", "invoice")
    .eq("entity_id", invoiceId)
    .like("body", "__warranty__%");
  if (warrantyText) {
    await admin.from("notes").insert({
      org_id: orgId!,
      entity_type: "invoice",
      entity_id: invoiceId,
      body: `__warranty__:${warrantyText}`,
      created_by: user?.id ?? null,
    });
  }
  revalidatePath(`/app/invoices/${invoiceId}`);
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiAttachmentsPromise = (admin as any)
    .from("ai_attachments")
    .select("id, title, note, is_pinned, created_at, ai_runs(id, feature, input_text, output_json, output_text, created_at)")
    .eq("org_id", orgId!)
    .eq("entity_type", "invoice")
    .eq("entity_id", id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  const [{ data: invoice }, { data: items }, { data: allNotes }, { data: photos }, { data: aiAttachmentsRaw }, { data: org }, { data: openedNotes }] = await Promise.all([
    admin.from("invoices").select("*").eq("id", id).eq("org_id", orgId!).maybeSingle(),
    admin.from("invoice_items").select("*").eq("invoice_id", id).eq("org_id", orgId!),
    admin.from("notes").select("*").eq("entity_type", "invoice").eq("entity_id", id).eq("org_id", orgId!).order("created_at", { ascending: false }).limit(20),
    admin.from("photos").select("id,url,filename,created_at").eq("entity_type", "invoice").eq("entity_id", id).eq("org_id", orgId!).order("created_at", { ascending: false }),
    aiAttachmentsPromise,
    admin.from("orgs").select("name").eq("id", orgId!).single(),
    admin.from("notes").select("created_at").eq("entity_type", "invoice").eq("entity_id", id).eq("org_id", orgId!).eq("body", "__opened__").order("created_at", { ascending: true }).limit(1),
  ]);
  const aiAttachments: AiAttachment[] = aiAttachmentsRaw ?? [];

  const notes = (allNotes ?? []).filter((n: any) => !n.body.startsWith("__warranty__") && !n.body.startsWith("__"));
  const warrantyNote = (allNotes ?? []).find((n: any) => n.body.startsWith("__warranty__")) ?? null;
  const warrantyText = warrantyNote ? String(warrantyNote.body).replace("__warranty__:", "") : null;
  const openedNote = (openedNotes as { created_at: string }[] | null)?.[0] ?? null;
  const orgName = org?.name ?? "Your Company";

  if (!invoice) return notFound();

  const { data: customer } = await admin.from("customers").select("first_name,last_name,company_name,phone,email").eq("id", invoice.customer_id).single();
  const customerName = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || customer?.company_name || "Unknown";

  const statusColor = STATUS_COLORS[invoice.status] ?? "bg-gray-100 text-gray-600";

  const dueDays = invoice.due_date
    ? Math.round((new Date(invoice.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const dueLabel = dueDays === null ? null : dueDays < 0 ? `${Math.abs(dueDays)}d overdue` : dueDays === 0 ? "Due today" : `Due in ${dueDays}d`;

  const boundSaveWarranty = saveWarrantyNote.bind(null, id);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/app/invoices" className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">Invoice {invoice.invoice_number ?? `#${id.slice(0,8)}`}</h1>
          <p className="text-sm text-gray-500">{customerName}</p>
          {openedNote ? (
            <p className="text-xs text-emerald-600 font-medium mt-0.5">
              👁 Opened {new Date(openedNote.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          ) : invoice.status === "unpaid" || invoice.status === "overdue" ? (
            <p className="text-xs text-gray-400 mt-0.5">Not opened yet</p>
          ) : null}
        </div>
        <span className={`text-xs font-semibold rounded-full px-3 py-1 ${statusColor}`}>
          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </span>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-3xl font-bold text-slate-800">${Number(invoice.total_amount).toLocaleString()}</p>
            {dueLabel && <p className={`text-xs mt-1 ${dueDays !== null && dueDays < 0 ? "text-red-500" : "text-gray-500"}`}>{dueLabel}</p>}
          </div>
          {invoice.job_id && (
            <Link href={`/app/jobs/${invoice.job_id}`} className="text-sm text-blue-600">View Job →</Link>
          )}
        </div>
        {items && items.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-slate-700">{item.description} × {item.quantity}</span>
                <span className="font-medium">${Number(item.total_price).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {invoice.status !== "paid" && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Collect Payment</p>
          <form action={markPaid} className="space-y-3">
            <input type="hidden" name="invoice_id" value={invoice.id} />
            <div className="grid grid-cols-3 gap-2">
              {["cash","check","card","venmo","paypal","other"].map(method => (
                <label key={method} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="payment_method" value={method} defaultChecked={method === "cash"}
                    className="accent-blue-700" />
                  <span className="text-sm capitalize">{method}</span>
                </label>
              ))}
            </div>
            <button type="submit"
              className="w-full rounded-xl py-3 text-white font-semibold text-lg"
              style={{ backgroundColor: "#22C55E" }}>
              ✅ Mark Paid — ${Number(invoice.total_amount).toLocaleString()}
            </button>
          </form>
        </div>
      )}

      {invoice.status === "paid" && (
        <div className="bg-green-50 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-green-700 font-semibold">✅ Invoice Paid</p>
        </div>
      )}

      <ShareCard
        type="invoice"
        customerName={customerName}
        customerPhone={customer?.phone ?? null}
        customerEmail={customer?.email ?? null}
        amount={Number(invoice.total_amount)}
        customerId={invoice.customer_id ?? ""}
        portalToken={null}
        orgName={orgName}
      />

      <WarrantyCard initialText={warrantyText} saveWarranty={boundSaveWarranty} />

      <PhotoGallery entityType="invoice" entityId={invoice.id} initialPhotos={photos ?? []} />

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Notes</p>
        <form action={addNote} className="flex gap-2 mb-4">
          <input type="hidden" name="id" value={invoice.id} />
          <input name="body" placeholder="Add a note…"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          <button type="submit"
            className="rounded-xl px-4 py-2 text-white text-sm font-semibold"
            style={{ backgroundColor: "#1B3A6B" }}>Add</button>
        </form>
        {!notes?.length && <p className="text-sm text-gray-400 text-center py-2">No notes yet.</p>}
        <div className="space-y-2">
          {notes?.map(note => (
            <div key={note.id} className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm text-slate-700">{note.body}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(note.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>
      <EntityAiSection entityType="invoice" entityId={invoice.id} initialAttachments={aiAttachments} />
    </div>
  );
}
