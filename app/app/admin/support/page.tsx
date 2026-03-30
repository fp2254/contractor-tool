import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import SupportClient from "./SupportClient";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  let tickets: any[] = [];
  try {
    const { data } = await (admin as any)
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    tickets = data ?? [];
  } catch {
    // Table may not exist yet
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mt-2">
        <h1 className="text-lg font-bold text-slate-800">Support Tickets</h1>
        <span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">{tickets.length} total</span>
      </div>
      {tickets.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          <p className="font-semibold mb-1">No tickets yet — or table not set up</p>
          <p className="text-xs">Run <code className="bg-amber-100 px-1 rounded">scripts/support-tickets-setup.sql</code> in Supabase Studio to create the table.</p>
        </div>
      )}
      <SupportClient initialTickets={tickets} />
    </div>
  );
}
