import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp?.q?.trim() ?? "";
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  let customers: any[] = [];
  let leads: any[] = [];
  let quotes: any[] = [];
  let jobs: any[] = [];
  let invoices: any[] = [];

  if (q.length >= 2) {
    const [c, l, qt, j, inv] = await Promise.all([
      admin.from("customers").select("id,first_name,last_name,company_name,phone,email")
        .eq("org_id", orgId!).or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,company_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`).limit(5),
      admin.from("leads").select("id,name,phone,email,status")
        .eq("org_id", orgId!).or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`).limit(5),
      admin.from("quotes").select("id,status,total_amount,customer_id")
        .eq("org_id", orgId!).limit(5),
      admin.from("jobs").select("id,job_title,status,scheduled_date")
        .eq("org_id", orgId!).ilike("job_title", `%${q}%`).limit(5),
      admin.from("invoices").select("id,invoice_number,status,total_amount")
        .eq("org_id", orgId!).or(`invoice_number.ilike.%${q}%`).limit(5),
    ]);
    customers = c.data ?? [];
    leads = l.data ?? [];
    quotes = qt.data ?? [];
    jobs = j.data ?? [];
    invoices = inv.data ?? [];
  }

  const total = customers.length + leads.length + quotes.length + jobs.length + invoices.length;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Search</h1>

      <form method="get" action="/app/search">
        <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 shadow-sm">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input name="q" defaultValue={q} placeholder="Search customers, leads, jobs…"
            autoFocus className="flex-1 text-sm outline-none bg-transparent" />
        </div>
      </form>

      {q.length >= 2 && total === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">No results for "{q}"</div>
      )}

      {customers.length > 0 && (
        <Section title="Customers">
          {customers.map(c => {
            const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "Unknown";
            return (
              <ResultRow key={c.id} href={`/app/customers/${c.id}`} icon="👤" title={name} sub={c.phone ?? c.email ?? ""} />
            );
          })}
        </Section>
      )}

      {leads.length > 0 && (
        <Section title="Leads">
          {leads.map(l => (
            <ResultRow key={l.id} href={`/app/leads/${l.id}`} icon="📌" title={l.name} sub={l.phone ?? l.email ?? l.status} />
          ))}
        </Section>
      )}

      {jobs.length > 0 && (
        <Section title="Jobs">
          {jobs.map(j => (
            <ResultRow key={j.id} href={`/app/jobs/${j.id}`} icon="🔨" title={j.job_title} sub={j.status.replace("_"," ")} />
          ))}
        </Section>
      )}

      {invoices.length > 0 && (
        <Section title="Invoices">
          {invoices.map(inv => (
            <ResultRow key={inv.id} href={`/app/invoices/${inv.id}`} icon="📄" title={inv.invoice_number ?? `#${inv.id.slice(0,8)}`} sub={`$${Number(inv.total_amount).toLocaleString()} · ${inv.status}`} />
          ))}
        </Section>
      )}

      {!q && (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
          Type to search across customers, leads, jobs, and invoices.
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{title}</p>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">{children}</div>
    </div>
  );
}

function ResultRow({ href, icon, title, sub }: { href: string; icon: string; title: string; sub: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3">
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <span className="text-gray-300">›</span>
    </Link>
  );
}
