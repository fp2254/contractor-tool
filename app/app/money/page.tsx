import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

async function archiveInvoice(formData: FormData) {
  "use server";
  const orgId = await ensureUserOrg();
  const invoiceId = String(formData.get("invoice_id"));
  const admin = createAdminClient();
  await admin
    .from("notes")
    .delete()
    .eq("entity_type", "invoice")
    .eq("entity_id", invoiceId)
    .eq("org_id", orgId!)
    .eq("body", "__archived__");
  await admin.from("notes").insert({
    org_id: orgId!,
    entity_type: "invoice",
    entity_id: invoiceId,
    body: "__archived__",
  } as Record<string, unknown>);
  revalidatePath("/app/money");
}

async function unarchiveInvoice(formData: FormData) {
  "use server";
  const orgId = await ensureUserOrg();
  const invoiceId = String(formData.get("invoice_id"));
  const admin = createAdminClient();
  await admin
    .from("notes")
    .delete()
    .eq("entity_type", "invoice")
    .eq("entity_id", invoiceId)
    .eq("org_id", orgId!)
    .eq("body", "__archived__");
  revalidatePath("/app/money");
}

const TABS = [
  { label: "Overdue", key: "overdue" },
  { label: "Open", key: "open" },
  { label: "Paid", key: "paid" },
  { label: "Archived", key: "archived" },
  { label: "All", key: "all" },
];

function dueLabel(due: string | null) {
  if (!due) return null;
  const diff = new Date(due).getTime() - Date.now();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: `Overdue ${Math.abs(days)}d`, cls: "bg-red-100 text-red-700" };
  if (days === 0) return { text: "Due today", cls: "bg-amber-100 text-amber-700" };
  return { text: `Due in ${days} days`, cls: "bg-amber-100 text-amber-700" };
}

type PageProps = { searchParams: Promise<Record<string, string>> };

export default async function MoneyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab = params.tab ?? "open";

  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [{ data: invoices }, { data: customers }, { data: archivedNotes }] = await Promise.all([
    admin
      .from("invoices")
      .select("id,status,total_amount,due_date,invoice_number,customer_id")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false }),
    admin
      .from("customers")
      .select("id,first_name,last_name,company_name")
      .eq("org_id", orgId!),
    admin
      .from("notes")
      .select("entity_id")
      .eq("org_id", orgId!)
      .eq("entity_type", "invoice")
      .eq("body", "__archived__"),
  ]);

  const archivedIds = new Set((archivedNotes ?? []).map((n) => n.entity_id as string));

  const customerMap = Object.fromEntries(
    (customers ?? []).map((c) => [
      c.id,
      [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "Unknown",
    ])
  );

  const all = invoices ?? [];
  const buckets: Record<string, typeof all> = {
    overdue: all.filter((i) => i.status === "overdue" && !archivedIds.has(i.id)),
    open: all.filter((i) => i.status === "unpaid" && !archivedIds.has(i.id)),
    paid: all.filter((i) => i.status === "paid" && !archivedIds.has(i.id)),
    archived: all.filter((i) => archivedIds.has(i.id)),
    all: all.filter((i) => !archivedIds.has(i.id)),
  };

  const shown = buckets[activeTab] ?? [];

  const sectionLabel: Record<string, string> = {
    overdue: "Overdue Invoices",
    open: "Open Invoices",
    paid: "Paid Invoices",
    archived: "Archived Invoices",
    all: "All Invoices",
  };

  return (
    <div className="p-4 space-y-3 pb-24">
      <h1 className="text-xl font-bold text-slate-800">Money</h1>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {TABS.map((tab) => {
          const count = buckets[tab.key]?.length ?? 0;
          const isActive = activeTab === tab.key;
          return (
            <Link
              key={tab.key}
              href={`/app/money?tab=${tab.key}`}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive ? "text-white" : "bg-white text-gray-600 shadow-sm"
              }`}
              style={isActive ? { backgroundColor: "#1B3A6B" } : {}}>
              {tab.label} {count > 0 && <span className="opacity-70">{count}</span>}
            </Link>
          );
        })}
      </div>

      <Link
        href="/app/invoices/new"
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white font-semibold"
        style={{ backgroundColor: "#1B3A6B" }}>
        <span className="text-lg leading-none">+</span> New Invoice
      </Link>

      {shown.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{sectionLabel[activeTab]}</p>
          <div className="space-y-3">
            {shown.map((inv) => (
              <InvoiceCard
                key={inv.id}
                inv={inv}
                customerName={customerMap[inv.customer_id ?? ""] ?? "Unknown"}
                isArchived={archivedIds.has(inv.id)}
                archiveAction={archiveInvoice}
                unarchiveAction={unarchiveInvoice}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
          {activeTab === "archived" ? "No archived invoices." : "No invoices here yet."}
        </div>
      )}
    </div>
  );
}

function InvoiceCard({
  inv,
  customerName,
  isArchived,
  archiveAction,
  unarchiveAction,
}: {
  inv: { id: string; status: string | null; total_amount: number | null; due_date: string | null; invoice_number: string | null };
  customerName: string;
  isArchived: boolean;
  archiveAction: (fd: FormData) => Promise<void>;
  unarchiveAction: (fd: FormData) => Promise<void>;
}) {
  const due = dueLabel(inv.due_date);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <Link href={`/app/invoices/${inv.id}`} className="block p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-slate-800 truncate">{customerName}</p>
            {inv.invoice_number && (
              <p className="text-xs text-gray-500">Invoice #{inv.invoice_number}</p>
            )}
          </div>
          {due && !isArchived && (
            <span className={`text-xs rounded-full px-2 py-0.5 font-medium shrink-0 ${due.cls}`}>
              {due.text}
            </span>
          )}
          {isArchived && (
            <span className="text-xs rounded-full px-2 py-0.5 font-medium shrink-0 bg-gray-100 text-gray-500">
              Archived
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-2xl font-bold text-slate-800">
            ${Number(inv.total_amount ?? 0).toLocaleString()}
          </p>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 capitalize">
            {inv.status === "unpaid" ? "open" : (inv.status ?? "")}
          </span>
        </div>
      </Link>

      <div className="border-t border-gray-100 px-4 py-2 flex justify-end">
        {isArchived ? (
          <form action={unarchiveAction}>
            <input type="hidden" name="invoice_id" value={inv.id} />
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs text-[#1B3A6B] font-medium py-1 px-2 rounded-lg active:bg-blue-50">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Unarchive
            </button>
          </form>
        ) : (
          <form action={archiveAction}>
            <input type="hidden" name="invoice_id" value={inv.id} />
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs text-gray-400 font-medium py-1 px-2 rounded-lg active:bg-gray-100">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8" />
              </svg>
              Archive
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
