import { Suspense } from "react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import QuotesListClient from "./QuotesListClient";

const TABS = [
  { label: "Sent",     key: "sent" },
  { label: "Draft",    key: "draft" },
  { label: "Accepted", key: "accepted" },
  { label: "Declined", key: "declined" },
  { label: "Archived", key: "archived" },
  { label: "All",      key: "all" },
];

type PageProps = { searchParams: Promise<Record<string, string>> };

export default async function QuotesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab = TABS.some(t => t.key === params.tab) ? params.tab : "sent";

  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const [{ data: quotes }, { data: customers }, { data: openedNotes }, { data: archivedNotes }] = await Promise.all([
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
    admin
      .from("notes")
      .select("entity_id")
      .eq("org_id", orgId!)
      .eq("entity_type", "quote")
      .eq("body", "__archived__"),
  ]);

  const openedIds = new Set((openedNotes ?? []).map(n => n.entity_id as string));
  const archivedIds = new Set((archivedNotes ?? []).map(n => n.entity_id as string));

  const customerMap = Object.fromEntries(
    (customers ?? []).map(c => [
      c.id,
      [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "Unknown",
    ])
  );

  const all = quotes ?? [];

  const buckets: Record<string, typeof all> = {
    sent:     all.filter(q => !archivedIds.has(q.id) && q.status === "sent"),
    draft:    all.filter(q => !archivedIds.has(q.id) && q.status === "draft"),
    accepted: all.filter(q => !archivedIds.has(q.id) && q.status === "accepted"),
    declined: all.filter(q => !archivedIds.has(q.id) && q.status === "declined"),
    archived: all.filter(q => archivedIds.has(q.id)),
    all:      all.filter(q => !archivedIds.has(q.id)),
  };

  const shown = buckets[activeTab] ?? [];

  return (
    <div className="p-4 space-y-3 pb-24">
      <h1 className="text-xl font-bold text-slate-800">Quotes</h1>

      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {TABS.map((tab) => {
          const count = buckets[tab.key]?.length ?? 0;
          const isActive = activeTab === tab.key;
          return (
            <Link
              key={tab.key}
              href={`/app/quotes?tab=${tab.key}`}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive ? "text-white" : "bg-white text-gray-600 shadow-sm"
              }`}
              style={isActive ? { backgroundColor: "#1B3A6B" } : {}}>
              {tab.label}{count > 0 && <span className="opacity-70 ml-1">{count}</span>}
            </Link>
          );
        })}
      </div>

      <Link
        href="/app/quotes/new"
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white font-semibold"
        style={{ backgroundColor: "#1B3A6B" }}>
        <span className="text-lg leading-none">+</span> New Quote
      </Link>

      <Suspense fallback={null} key={activeTab}>
        <QuotesListClient
          quotes={shown}
          customerMap={customerMap}
          openedIds={Array.from(openedIds)}
          activeTab={activeTab}
        />
      </Suspense>
    </div>
  );
}
