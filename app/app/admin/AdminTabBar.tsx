"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Overview", href: "/app/admin" },
  { label: "Memberships", href: "/app/admin/memberships" },
  { label: "Orgs", href: "/app/admin/orgs" },
  { label: "Users", href: "/app/admin/users" },
  { label: "Waitlist", href: "/app/admin/waitlist" },
  { label: "Support", href: "/app/admin/support" },
  { label: "Reviews", href: "/app/admin/reviews" },
  { label: "Demo", href: "/app/admin/demo" },
  { label: "System", href: "/app/admin/system" },
  { label: "Billing", href: "/app/admin/billing" },
  { label: "Add-ons", href: "/app/admin/addons" },
];

export default function AdminTabBar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/app/admin") return pathname === "/app/admin";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex overflow-x-auto gap-1 pb-0 scrollbar-hide -mx-1 px-1">
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap ${
              active
                ? "bg-gray-100 text-[#1B3A6B]"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
