import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

const TABS = ["Overdue", "Open", "Paid", "All"];

const STATUS_BADGE: Record<string, string> = {
  unpaid: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
  paid: "bg-green-100 text-green-700",
};

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dueLabel(due: string | null) {
  if (!due) return null;
  const diff = new Date(due).getTime() - Date.now();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return `Overdue ${Math.abs(days)}d`;
  if (days === 0) return "Due today";
  return `Due in ${days} days`;
}

export default async function MoneyPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const { data: invoices } = await admin
    .from("invoices")
    .select("id,status,total_amount,due_date,invoice_number,customer_id")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: false });

  const { data: customers } = await admin
    .from("customers")
    .select("id,first_name,last_name")
    .eq("org_id", orgId!);

  const customerMap = Object.fromEntries((customers ?? []).map((c) => [c.id, `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()]));

  const overdue = invoices?.filter(i => i.status === "overdue") ?? [];
  const open = invoices?.filter(i => i.status === "unpaid") ?? [];
  const paid = invoices?.filter(i => i.status === "paid") ?? [];

  const tabCounts = { overdue: overdue.length, open: open.length, paid: paid.length, all: invoices?.length ?? 0 };

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold text-slate-800">Money</h1>

      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
        {TABS.map((tab) => {
          const key = tab.toLowerCase();
          const count = (tabCounts as any)[key] ?? 0;
          const isActive = tab === "Open";
          return (
            <button key={tab} className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${isActive ? "text-white" : "bg-white text-gray-600"}`}
              style={isActive ? { backgroundColor: "#1B3A6B" } : {}}>
              {tab} {count}
            </button>
          );
        })}
      </div>

      <Link href="/app/invoices"
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white font-semibold"
        style={{ backgroundColor: "#1B3A6B" }}>
        <span className="text-lg">+</span> New Invoice
      </Link>

      {overdue.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Overdue</p>
          <div className="space-y-3">
            {overdue.map((inv) => (
              <InvoiceCard key={inv.id} inv={inv} customerName={customerMap[inv.customer_id] ?? "Unknown"} />
            ))}
          </div>
        </div>
      )}

      {open.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Open Invoices</p>
          <div className="space-y-3">
            {open.map((inv) => (
              <InvoiceCard key={inv.id} inv={inv} customerName={customerMap[inv.customer_id] ?? "Unknown"} />
            ))}
          </div>
        </div>
      )}

      {!invoices?.length && (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">No invoices yet.</div>
      )}
    </div>
  );
}

function InvoiceCard({ inv, customerName }: { inv: any; customerName: string }) {
  const label = dueLabel(inv.due_date);
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-slate-800">{customerName}</p>
          {inv.invoice_number && <p className="text-xs text-gray-500">Invoice #{inv.invoice_number}</p>}
        </div>
        {label && (
          <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-medium shrink-0">{label}</span>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-2xl font-bold text-slate-800">${Number(inv.total_amount).toLocaleString()}</p>
        <span className="text-blue-500">✉️</span>
      </div>
    </div>
  );
}
