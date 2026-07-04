export type SidebarNavItem = {
  id: string;
  label: string;
  href: string;
  exact?: boolean;
  icon: string;
};

export const ALL_SIDEBAR_ITEMS: SidebarNavItem[] = [
  { id: "home",           label: "Home",               href: "/app",                exact: true, icon: "🏠" },
  { id: "clients",        label: "Clients",            href: "/app/customers",      icon: "👤" },
  { id: "leads",          label: "Leads",              href: "/app/leads",          icon: "🎯" },
  { id: "quotes",         label: "Quotes",             href: "/app/quotes",         icon: "📄" },
  { id: "jobs",           label: "Jobs",               href: "/app/jobs",           icon: "🔨" },
  { id: "invoices",       label: "Invoices",           href: "/app/invoices",       icon: "💵" },
  { id: "schedule",       label: "Schedule",           href: "/app/schedule",       icon: "📅" },
  { id: "expenses",       label: "Expenses",           href: "/app/expenses",       icon: "💸" },
  { id: "activity",       label: "Activity Log",       href: "/app/activity",       icon: "📋" },
  { id: "team",           label: "Team",               href: "/app/team",           icon: "🧑‍🤝‍🧑" },
  { id: "trade-contacts", label: "Trade Contacts",     href: "/app/trade-contacts", icon: "👥" },
  { id: "inventory",      label: "Inventory",          href: "/app/inventory",      icon: "📦" },
  { id: "reports",        label: "Reports",            href: "/app/reports",        icon: "📊" },
  { id: "requests",       label: "Quote Requests",     href: "/app/requests",       icon: "📬" },
  { id: "phone",          label: "AI Phone",           href: "/app/phone",          icon: "📞" },
  { id: "projects",       label: "Completed Projects", href: "/app/projects",       icon: "🏗️" },
];

export const DEFAULT_SIDEBAR_IDS = ["home", "clients", "quotes", "jobs", "invoices", "team"];
export const SIDEBAR_STORAGE_KEY = "tb_sidebar_items";
export const SIDEBAR_UPDATED_EVENT = "tb-sidebar-updated";
export const MIN_SIDEBAR_ITEMS = 3;
export const MAX_SIDEBAR_ITEMS = ALL_SIDEBAR_ITEMS.length;
