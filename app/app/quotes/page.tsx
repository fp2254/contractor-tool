import { Suspense } from "react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import QuotesListClient from "./QuotesListClient";

export default async function QuotesPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [{ data: quotes }, { data: customers }, { data: openedNotes }] = await Promise.all([
    admin
      .from("quotes")
      .select("id,status,total_amount,created_at,customer_id")
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
      .eq("entity_type", "quote")
      .eq("body", "__opened__"),
  ]);

  const openedIds = new Set((openedNotes ?? []).map(n => n.entity_id as string));

  const customerMap = Object.fromEntries(
    (customers ?? []).map(c => [
      c.id,
      [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "Unknown",
    ])
  );

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Quotes</h1>
      </div>

      <Link
        href="/app/quotes/new"
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white font-semibold"
        style={{ backgroundColor: "#1B3A6B" }}>
        <span className="text-lg">+</span> New Quote
      </Link>

      <Suspense fallback={null}>
        <QuotesListClient
          initialQuotes={quotes ?? []}
          customerMap={customerMap}
          openedIds={Array.from(openedIds)}
        />
      </Suspense>
    </div>
  );
}
