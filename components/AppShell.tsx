"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { QuickCreate } from "@/components/QuickCreate";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill={active ? "#1B3A6B" : "none"} stroke={active ? "#1B3A6B" : "#9ca3af"} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />
    </svg>
  );
}
function LeadsIcon({ active }: { active: boolean }) {
  const c = active ? "#1B3A6B" : "#9ca3af";
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={c} strokeWidth={2}>
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
function QuotesIcon({ active }: { active: boolean }) {
  const c = active ? "#1B3A6B" : "#9ca3af";
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={c} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 8h6M9 16h4" />
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}
function JobsIcon({ active }: { active: boolean }) {
  const c = active ? "#1B3A6B" : "#9ca3af";
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={c} strokeWidth={2}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path strokeLinecap="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  );
}
function MoneyIcon({ active }: { active: boolean }) {
  const c = active ? "#1B3A6B" : "#9ca3af";
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={c} strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M12 6v12M9 9h4.5a1.5 1.5 0 010 3H10.5a1.5 1.5 0 000 3H15" />
    </svg>
  );
}
function MoreIcon({ active }: { active: boolean }) {
  const c = active ? "#1B3A6B" : "#9ca3af";
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill={c}>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

const navItems = [
  { label: "Home",    href: "/app",             Icon: HomeIcon,   exact: true  },
  { label: "Clients", href: "/app/customers",   Icon: LeadsIcon,  exact: false },
  { label: "Quotes",  href: "/app/quotes",      Icon: QuotesIcon, exact: false },
  { label: "Jobs",    href: "/app/jobs",         Icon: JobsIcon,   exact: false },
  { label: "Invoices", href: "/app/invoices",     Icon: MoneyIcon,  exact: false },
  { label: "More",    href: "/app/more",         Icon: MoreIcon,   exact: false },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3" style={{ backgroundColor: "#1B3A6B" }}>
        <Link href="/app" className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="white">
            <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
            <rect x="9" y="14" width="6" height="7" rx="0.5" fill="white" />
          </svg>
          <span className="text-xl font-bold text-white">TradeBase</span>
        </Link>
        <Link href="/app/more" className="text-white p-1">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="white">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </Link>
      </header>

      <main className="flex-1 pt-14 pb-20 overflow-y-auto">
        {children}
      </main>

      <QuickCreate />

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <div className="flex">
          {navItems.map(({ label, href, Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link key={href} href={href} className="flex-1 flex flex-col items-center py-2 gap-0.5">
                <Icon active={active} />
                <span className={`text-[10px] font-medium ${active ? "text-[#1B3A6B]" : "text-gray-400"}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
