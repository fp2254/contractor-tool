"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FolderOpen, Home, Image, Star, MessageSquare,
  Bookmark, TrendingUp, DollarSign, FileText, Settings, Bell,
  Search, HelpCircle, ChevronRight, Globe,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard",          href: "/homeowner" },
  { icon: FolderOpen,      label: "Projects",           href: "/homeowner/projects" },
  { icon: Home,            label: "Property Profile",   href: "/homeowner/property" },
  { icon: Image,           label: "Photos & Documents", href: "/homeowner/photos" },
  { icon: Star,            label: "Reviews",            href: "/homeowner/reviews" },
  { icon: MessageSquare,   label: "Messages",           href: "/homeowner/messages" },
  { icon: Bookmark,        label: "Saved Contractors",  href: "/homeowner/saved" },
  { icon: TrendingUp,      label: "Future Projects",    href: "/homeowner/future" },
  { icon: DollarSign,      label: "Finances",           href: "/homeowner/finances" },
  { icon: FileText,        label: "Documents",          href: "/homeowner/documents" },
  { icon: Settings,        label: "Settings",           href: "/homeowner/settings" },
];

export default function HomeownerShell({
  children,
  profileId: _profileId,
  displayName,
  avatarUrl,
  profileCompletion,
  slug,
}: {
  children: React.ReactNode;
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  profileCompletion: number;
  slug: string | null;
}) {
  const pathname = usePathname();

  const initials = displayName
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "HO";

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden text-sm">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0 overflow-y-auto">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-100">
          <Link href="/homeowner" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1B3A6B" }}>
              <Home size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base tracking-tight">TRADEBASE</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
            const active = pathname === href || (href !== "/homeowner" && pathname.startsWith(href));
            return (
              <Link
                key={label}
                href={href}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                  active ? "text-white font-semibold" : "text-gray-600 hover:bg-gray-50"
                }`}
                style={active ? { backgroundColor: "#1B3A6B" } : {}}>
                <Icon size={16} className={active ? "text-white" : "text-gray-500"} />
                <span className="flex-1 text-[13px]">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* My Showcase link */}
        <div className="px-3 pb-2">
          {slug ? (
            <a href={`/h/${slug}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors text-[13px] group">
              <Globe size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span className="flex-1">My Showcase</span>
              <span className="text-[9px] text-gray-300">↗</span>
            </a>
          ) : (
            <Link href="/homeowner/settings"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-[13px] hover:bg-blue-100 transition-colors">
              <Globe size={16} />
              <span className="flex-1 font-semibold">Set up showcase</span>
            </Link>
          )}
        </div>

        {/* Profile completion widget */}
        {profileCompletion < 100 && (
          <div className="px-4 py-4 border-t border-gray-100">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-700 mb-1">Complete your profile</p>
              <p className="text-[10px] text-gray-500 mb-2 leading-relaxed">
                Add details about your property to get better contractor matches.
              </p>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-blue-600">{profileCompletion}% Complete</span>
              </div>
              <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
              </div>
              <Link
                href="/homeowner/property"
                className="mt-2 block w-full rounded-lg py-1.5 text-xs font-semibold text-white text-center"
                style={{ backgroundColor: "#1B3A6B" }}>
                Add Details
              </Link>
            </div>
          </div>
        )}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 bg-white border-b border-gray-100 flex items-center px-6 gap-4 shrink-0">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search contractors, projects, or categories…"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-600 outline-none focus:ring-1 focus:ring-blue-200"
            />
          </div>
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
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: "#1B3A6B" }}>
                {initials}
              </div>
            )}
            <span className="text-xs font-semibold text-gray-800 hidden sm:block">{displayName}</span>
            <ChevronRight size={12} className="text-gray-400 rotate-90" />
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
