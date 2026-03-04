import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

export default async function QuotesPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { data: quotes } = await admin
    .from("quotes").select("id,status,total_amount,created_at,customer_id")
    .eq("org_id", orgId!).order("created_at", { ascending: false });

  const { data: customers } = await admin
    .from("customers").select("id,first_name,last_name,company_name").eq("org_id", orgId!);
  const customerMap = Object.fromEntries((customers ?? []).map(c => [
    c.id, [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "Unknown",
  ]));

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Quotes</h1>
      </div>

      <Link href="/app/quotes/new"
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white font-semibold"
        style={{ backgroundColor: "#1B3A6B" }}>
        <span className="text-lg">+</span> New Quote
      </Link>

      {!quotes?.length ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">No quotes yet.</div>
      ) : (
        <div className="space-y-3">
          {quotes.map(q => (
            <Link key={q.id} href={`/app/quotes/${q.id}`} className="block bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-800">{customerMap[q.customer_id] ?? "Unknown"}</p>
                  <p className="text-xs text-gray-400">Quote #{q.id.slice(0,8)} · {new Date(q.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[q.status] ?? "bg-gray-100"}`}>
                    {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                  </span>
                  <span className="text-base font-bold text-slate-800">${Number(q.total_amount).toLocaleString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
