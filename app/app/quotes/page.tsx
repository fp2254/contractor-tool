import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

export default async function QuotesPage() {
  const supabase = await createClient();
  const orgId = await ensureUserOrg();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id,status,total_amount,created_at")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: false });

  return (
    <div className="grid gap-4">
      <Link href="/app/quotes/new">
        <Button>New Quote</Button>
      </Link>
      <Card title="Quotes">
        <div className="space-y-2">
          {quotes?.map((quote) => (
            <Link key={quote.id} href={`/app/quotes/${quote.id}`} className="block rounded-lg bg-slate-100 p-3">
              #{quote.id.slice(0, 8)} · {quote.status} · ${quote.total_amount}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
