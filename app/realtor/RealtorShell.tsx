"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Settings, Bell, HelpCircle,
  ChevronRight, Globe, LogOut, MapPin, Link2, Users, SendHorizonal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard",   href: "/realtor" },
  { icon: MapPin,          label: "Directory",   href: "/realtor/directory" },
  { icon: Link2,           label: "Connections", href: "/realtor/connections" },
  { icon: Users,           label: "Contacts",    href: "/realtor/contacts" },
  { icon: SendHorizonal,   label: "Requests",    href: "/realtor/requests" },
  { icon: Settings,        label: "Settings",    href: "/realtor/settings" },
];

const MOBILE_NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Home",    href: "/realtor" },
  { icon: MapPin,          label: "Directory", href: "/realtor/directory" },
  { icon: Link2,           label: "Connect", href: "/realtor/connections" },
  { icon: SendHorizonal,   label: "Requests", href: "/realtor/requests" },
  { icon: Settings,        label: "Settings", href: "/realtor/settings" },
];

export default function RealtorShell({
  children,
  displayName,
  avatarUrl,
  profileCompletion,
  slug,
}: {
  children: React.ReactNode;
  displayName: string;
  avatarUrl: string | null;
  profileCompletion: number;
  slug: string | null;
}) {
  const pathname = usePathname();

  const initials =
    displayName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "RE";

  function isActive(href: string) {
    return pathname === href || (href !== "/realtor" && pathname.startsWith(href));
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-sm">
      {/* ── Desktop fixed left sidebar (lg and up) ── */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-56 lg:z-50 bg-white border-r border-gray-100">
        <div className="px-4 py-4 border-b border-gray-100">
          <Link href="/realtor" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1B3A6B" }}>
              <Building2 size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base tracking-tight">TRADEBASE</span>
          </Link>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1 ml-9">Realtor</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
            const active = isActive(href);
            return (
              <Link
                key={label}
                href={href}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                  active ? "text-white font-semibold" : "text-gray-600 hover:bg-gray-50"
                }`}
                style={active ? { backgroundColor: "#1B3A6B" } : {}}
              >
                <Icon size={16} className={active ? "text-white" : "text-gray-500"} />
                <span className="flex-1 text-[13px]">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-3 border-t border-gray-100 pt-3">
          {slug ? (
            <a
              href={`/agent/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1B3A6B" }}
            >
              <Globe size={14} />
              View My Profile ↗
            </a>
          ) : (
            <Link
              href="/realtor/settings"
              className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-[13px] font-semibold border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Globe size={14} />
              Set Up Profile URL
            </Link>
          )}
        </div>

        {profileCompletion < 100 && (
          <div className="px-4 py-4 border-t border-gray-100">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-700 mb-1">Complete your profile</p>
              <p className="text-[10px] text-gray-500 mb-2 leading-relaxed">
                Add your details so contractors and clients can find you.
              </p>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-blue-600">{profileCompletion}% Complete</span>
              </div>
              <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
              </div>
              <Link
                href="/realtor/settings"
                className="mt-2 block w-full rounded-lg py-1.5 text-xs font-semibold text-white text-center"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                Add Details
              </Link>
            </div>
          </div>
        )}

        <div className="px-3 pb-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <LogOut size={16} />
            <span className="text-[13px]">Log Out</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile fixed top header (below lg) ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <Link href="/realtor" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1B3A6B" }}>
            <Building2 size={14} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm tracking-tight block leading-none">TRADEBASE</span>
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide">Realtor</span>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <button className="p-2 text-gray-500">
            <Bell size={18} />
          </button>
          <button className="p-2 text-gray-500">
            <HelpCircle size={18} />
          </button>
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: "#1B3A6B" }}
            >
              {initials}
            </div>
          )}
        </div>
      </header>

      {/* ── Desktop fixed top bar (lg and up) ── */}
      <div className="hidden lg:flex lg:fixed lg:top-0 lg:left-56 lg:right-0 lg:z-40 lg:h-12 items-center justify-end bg-white border-b border-gray-100 px-6 gap-4">
        <button className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-lg">
          <Bell size={16} />
        </button>
        <button className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg">
          <HelpCircle size={16} />
        </button>
        <div className="flex items-center gap-2">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: "#1B3A6B" }}
            >
              {initials}
            </div>
          )}
          <span className="text-xs font-semibold text-gray-800">{displayName}</span>
          <ChevronRight size={12} className="text-gray-400 rotate-90" />
        </div>
      </div>

      <main className="lg:pl-56 pt-14 lg:pt-12 pb-20 lg:pb-0 min-h-screen">{children}</main>

      {/* ── Mobile fixed bottom nav (below lg) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <div className="flex">
          {MOBILE_NAV_ITEMS.map(({ icon: Icon, label, href }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} className="flex-1 flex flex-col items-center py-2 gap-0.5">
                <Icon size={20} className={active ? "text-[#1B3A6B]" : "text-gray-400"} />
                <span className={`text-[10px] font-medium ${active ? "text-[#1B3A6B]" : "text-gray-400"}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
