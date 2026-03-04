import Link from "next/link";

const links = [
  ["Dashboard", "/app"],
  ["Customers", "/app/customers"],
  ["Quotes", "/app/quotes"],
  ["Follow-Ups", "/app/followups"],
  ["Invoices", "/app/invoices"],
  ["Jobs", "/app/jobs"],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl p-4 pb-20">
      <header className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-xl font-bold">TradeBase</p>
        <nav className="mt-3 flex flex-wrap gap-2">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
