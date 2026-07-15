"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { QuickCreate } from "@/components/QuickCreate";
import {
  ALL_SIDEBAR_ITEMS,
  DEFAULT_SIDEBAR_IDS,
  SIDEBAR_STORAGE_KEY,
  SIDEBAR_UPDATED_EVENT,
} from "@/lib/sidebarNav";

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

function readSidebarIds(): string[] {
  try {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_SIDEBAR_IDS;
}

export function AppShell({
  children,
  userEmail = "",
  userName = "",
}: {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [sidebarIds, setSidebarIds] = useState<string[]>(DEFAULT_SIDEBAR_IDS);
  const [searchQuery, setSearchQuery] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const initials = userName
    ? userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : (userEmail[0] ?? "?").toUpperCase();

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

  useEffect(() => {
    setSidebarIds(readSidebarIds());
    const onSidebarUpdated = () => setSidebarIds(readSidebarIds());
    window.addEventListener(SIDEBAR_UPDATED_EVENT, onSidebarUpdated);
    window.addEventListener("storage", onSidebarUpdated);
    return () => {
      window.removeEventListener(SIDEBAR_UPDATED_EVENT, onSidebarUpdated);
      window.removeEventListener("storage", onSidebarUpdated);
    };
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    function handleClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [accountOpen]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length >= 2) {
      router.push(`/app/search?q=${encodeURIComponent(q)}`);
    } else if (q.length === 0) {
      router.push("/app/search");
    }
  }

  const sidebarItems = sidebarIds
    .map(id => ALL_SIDEBAR_ITEMS.find(item => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

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
          {sidebarItems.map(({ id, label, href, icon, exact }) => {
            const active = isActive(href, !!exact);
            return (
              <Link
                key={id}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-white/10 text-white" : "text-blue-100/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-lg w-6 text-center leading-none">{icon}</span>
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
      <div className="hidden lg:flex lg:fixed lg:top-0 lg:left-64 lg:right-0 lg:z-40 lg:h-14 items-center gap-4 bg-white border-b border-gray-200 px-6">

        {/* Global search bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
          <div className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1B3A6B]/30 rounded-lg px-3 py-1.5 transition-colors">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers, leads, jobs…"
              className="flex-1 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-gray-400 hover:text-gray-600 shrink-0"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </form>

        <div className="flex-1" />

        {/* Notification bell — links to activity log */}
        <Link
          href="/app/activity"
          className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0"
          title="Activity &amp; notifications"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </Link>

        {/* Offline badge */}
        {!isOnline && (
          <span className="flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-800 inline-block" />
            Offline
          </span>
        )}

        {/* Account / avatar menu */}
        <div ref={accountRef} className="relative shrink-0">
          <button
            onClick={() => setAccountOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
          >
            <span
              className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: "#1B3A6B" }}
            >
              {initials}
            </span>
            <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate hidden xl:block">
              {userName || userEmail}
            </span>
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400 hidden xl:block" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {accountOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                {userName && <p className="text-sm font-semibold text-gray-800 truncate">{userName}</p>}
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              </div>
              <div className="py-1">
                <Link
                  href="/app/more"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                  </svg>
                  Settings &amp; More
                </Link>
                <Link
                  href="/app/profile"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="8" r="4" /><path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                  My Profile
                </Link>
              </div>
              <div className="border-t border-gray-100 py-1">
                <Link
                  href="/auth/signout"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h6a2 2 0 012 2v1" />
                  </svg>
                  Sign out
                </Link>
              </div>
            </div>
          )}
        </div>
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

      {/* ── Mobile fixed bottom nav (below lg) — mirrors desktop sidebar top 5 items ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <div className="flex">
          {sidebarItems.slice(0, 5).map(({ id, label, href, icon, exact }) => {
            const active = isActive(href, !!exact);
            return (
              <Link key={id} href={href} className="flex-1 flex flex-col items-center py-2 gap-0.5">
                <span className={`text-2xl leading-none ${active ? "" : "opacity-40"}`}>{icon}</span>
                <span className={`text-[10px] font-medium ${active ? "text-[#1B3A6B]" : "text-gray-400"}`}>{label}</span>
              </Link>
            );
          })}
          <Link href="/app/more" className="flex-1 flex flex-col items-center py-2 gap-0.5">
            <MoreIcon active={isActive("/app/more", false)} />
            <span className={`text-[10px] font-medium ${isActive("/app/more", false) ? "text-[#1B3A6B]" : "text-gray-400"}`}>More</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
