"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
function TeamIcon({ active }: { active: boolean }) {
  const c = active ? "#1B3A6B" : "#9ca3af";
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={c} strokeWidth={2}>
      <circle cx="9" cy="7" r="3" />
      <path strokeLinecap="round" d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path strokeLinecap="round" d="M17 14c2.8 0 4 1.8 4 4" />
    </svg>
  );
}
function MoreIcon({ active }: { active: boolean }) {
  const c = active ? "#1B3A6B" : "#9ca3af";
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill={c}>
      <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

const navItems = [
  { label: "Home",     href: "/app",            Icon: HomeIcon,   exact: true  },
  { label: "Clients",  href: "/app/customers",  Icon: LeadsIcon,  exact: false },
  { label: "Quotes",   href: "/app/quotes",     Icon: QuotesIcon, exact: false },
  { label: "Jobs",     href: "/app/jobs",       Icon: JobsIcon,   exact: false },
  { label: "Invoices", href: "/app/invoices",   Icon: MoneyIcon,  exact: false },
  { label: "Team",     href: "/app/team",       Icon: TeamIcon,   exact: false },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Desktop fixed left sidebar (lg and up) ── */}
      <aside
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:z-50"
        style={{ backgroundColor: "#1B3A6B" }}
      >
        <Link href="/app" className="flex items-center gap-2 px-6 py-5 shrink-0">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="white">
            <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
            <rect x="9" y="14" width="6" height="7" rx="0.5" fill="white" />
          </svg>
          <span className="text-xl font-bold text-white">TradeBase</span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          {navItems.map(({ label, href, Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-white/10 text-white" : "text-blue-100/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon active={active} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {!isOnline && (
          <div className="mx-3 mb-2 flex items-center justify-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-800 inline-block" />
            Offline
          </div>
        )}

        <Link
          href="/app/more"
          className={`flex items-center gap-3 px-6 py-4 border-t border-white/10 text-sm font-medium transition-colors ${
            isActive("/app/more", false) ? "text-white" : "text-blue-100/70 hover:text-white"
          }`}
        >
          <MoreIcon active={isActive("/app/more", false)} />
          <span>More</span>
        </Link>
      </aside>

      {/* ── Mobile fixed top header (below lg) ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3" style={{ backgroundColor: "#1B3A6B" }}>
        <Link href="/app" className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="white">
            <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
            <rect x="9" y="14" width="6" height="7" rx="0.5" fill="white" />
          </svg>
          <span className="text-xl font-bold text-white">TradeBase</span>
        </Link>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-800 inline-block" />
              Offline
            </span>
          )}
          <Link href="/app/more" className="text-white p-1">
            <MoreIcon active={false} />
          </Link>
        </div>
      </header>

      {/* ── Desktop fixed top bar (lg and up) ── */}
      <div className="hidden lg:flex lg:fixed lg:top-0 lg:left-64 lg:right-0 lg:z-40 lg:h-14 items-center justify-end bg-white border-b border-gray-200 px-6">
        {!isOnline && (
          <span className="flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-800 inline-block" />
            Offline
          </span>
        )}
      </div>

      {!isOnline && (
        <div className="lg:hidden fixed top-[52px] left-0 right-0 z-40 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <span className="text-sm">📡</span>
          <p className="text-xs font-medium text-amber-800">
            You&apos;re offline — showing cached data. Changes will save when you reconnect.
          </p>
        </div>
      )}

      <main className={`lg:pl-64 ${isOnline ? "pt-14" : "pt-[84px]"} lg:pt-14 pb-20 lg:pb-0 min-h-screen overflow-y-auto`}>
        {children}
      </main>

      <QuickCreate />

      {/* ── Mobile fixed bottom nav (below lg) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
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
