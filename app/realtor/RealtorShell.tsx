"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Settings, Bell, HelpCircle,
  ChevronRight, Globe, LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/realtor" },
  { icon: Settings,        label: "Settings",  href: "/realtor/settings" },
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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden text-sm">
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0 overflow-y-auto">
        <div className="px-4 py-4 border-b border-gray-100">
          <Link href="/realtor" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1B3A6B" }}>
              <Building2 size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base tracking-tight">TRADEBASE</span>
          </Link>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1 ml-9">Realtor</p>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
            const active = pathname === href || (href !== "/realtor" && pathname.startsWith(href));
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

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 bg-white border-b border-gray-100 flex items-center px-6 gap-4 shrink-0">
          <div className="flex-1" />
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
            <span className="text-xs font-semibold text-gray-800 hidden sm:block">{displayName}</span>
            <ChevronRight size={12} className="text-gray-400 rotate-90" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
