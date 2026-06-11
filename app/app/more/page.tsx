import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/admin";
import { getUserOrgRole, isOwnerOrAdmin } from "@/lib/orgRole";
import { ensureUserOrg } from "@/lib/auth";
import { redirect } from "next/navigation";

const MENU_ITEMS = [
  { label: "Quote Requests",     href: "/app/requests",       emoji: "📬", color: "#F97316" },
  { label: "My Reviews",         href: "/app/reviews",         emoji: "⭐", color: "#F59E0B" },
  { label: "Expenses",           href: "/app/expenses",        emoji: "💸", color: "#16A34A" },
  { label: "Activity Log",       href: "/app/activity",        emoji: "📋", color: "#1B3A6B" },
  { label: "Scan Receipt",       href: "/app/receipts",        emoji: "🧾", color: "#16A34A" },
  { label: "Completed Projects", href: "/app/projects",        emoji: "🏗️", color: "#1B3A6B" },
  { label: "Leads",              href: "/app/leads",           emoji: "🎯", color: "#F97316" },
  { label: "Schedule",           href: "/app/schedule",        emoji: "📅", color: "#1B3A6B" },
  { label: "Trade Contacts",     href: "/app/trade-contacts",  emoji: "👥", color: "#1B3A6B" },
  { label: "Inventory",          href: "/app/inventory",       emoji: "📦", color: "#8B4513" },
  { label: "Accounting Export",  href: "/app/export",          emoji: "📤", color: "#16A34A" },
  { label: "Earn With TradeBase",href: "/app/referral",        emoji: "💰", color: "#16A34A" },
  { label: "Reports",            href: "/app/reports",         emoji: "📊", color: "#1B3A6B" },
  { label: "My Profile",         href: "/app/my-profile",      emoji: "🌐", color: "#1B3A6B" },
  { label: "Settings",           href: "/app/profile",         emoji: "⚙️", color: "#6B7280" },
  { label: "App Settings",       href: "/app/settings",        emoji: "🔧", color: "#6B7280" },
  { label: "Support",            href: "/app/support",         emoji: "❓", color: "#6B7280" },
];

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export default async function MorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = isPlatformAdmin(user?.email);
  const { role } = await getUserOrgRole();
  const canManageTemplates = isOwnerOrAdmin(role);

  // Fetch showcase slug
  let showcaseSlug: string | null = null;
  try {
    const orgId = await ensureUserOrg();
    const admin = createAdminClient() as any;
    const { data: pub } = await admin
      .from("public_profiles")
      .select("slug")
      .eq("org_id", orgId!)
      .maybeSingle();
    showcaseSlug = pub?.slug ?? null;
  } catch { /* ignore */ }

  const showcaseHref  = showcaseSlug ? `/showcase/${showcaseSlug}` : "/app/profile/public-profile";
  const showcaseLabel = showcaseSlug ? "My Portfolio" : "Set Up Portfolio";
  const showcaseBadge = showcaseSlug ? null : "Setup needed";

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-800 mb-4">More</h1>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">

        {/* Portfolio showcase — prominent at top */}
        <Link href={showcaseHref}
          className="flex items-center gap-4 px-4 py-4 bg-gradient-to-r from-purple-50 to-white">
          <div className="h-9 w-9 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: "#8B5CF620" }}>
            ✨
          </div>
          <div className="flex-1">
            <span className="font-semibold text-purple-700">{showcaseLabel}</span>
            {showcaseBadge ? (
              <p className="text-[11px] text-purple-400 mt-0.5">Tap to set up your public portfolio page</p>
            ) : (
              <p className="text-[11px] text-gray-400 mt-0.5">/showcase/{showcaseSlug}</p>
            )}
          </div>
          {showcaseBadge && (
            <span className="text-[10px] font-bold bg-purple-100 text-purple-600 rounded-full px-2 py-0.5 mr-1">
              {showcaseBadge}
            </span>
          )}
          <span className="text-gray-300 text-lg">›</span>
        </Link>

        {MENU_ITEMS.map((item) => (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-4 px-4 py-4">
            <div className="h-9 w-9 rounded-full flex items-center justify-center text-lg"
              style={{ backgroundColor: item.color + "20" }}>
              {item.emoji}
            </div>
            <span className="flex-1 font-medium text-slate-700">{item.label}</span>
            <span className="text-gray-300 text-lg">›</span>
          </Link>
        ))}

        <Link href="/app/templates"
          className="flex items-center gap-4 px-4 py-4">
          <div className="h-9 w-9 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: "#1B3A6B20" }}>
            🗂️
          </div>
          <span className="flex-1 font-medium text-slate-700">Job Templates</span>
          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 mr-1">Soon</span>
          <span className="text-gray-300 text-lg">›</span>
        </Link>

        {isAdmin && (
          <Link href="/app/admin"
            className="flex items-center gap-4 px-4 py-4">
            <div className="h-9 w-9 rounded-full flex items-center justify-center text-lg bg-amber-50">
              🛡️
            </div>
            <div className="flex-1">
              <span className="font-medium text-amber-700">Platform Admin</span>
              <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 font-bold uppercase">Internal</span>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </Link>
        )}

        <form action={signOut}>
          <button type="submit" className="flex items-center gap-4 px-4 py-4 w-full text-left">
            <div className="h-9 w-9 rounded-full flex items-center justify-center bg-red-50 text-lg">🔴</div>
            <span className="flex-1 font-medium text-red-500">Log Out</span>
            <span className="text-gray-300 text-lg">›</span>
          </button>
        </form>
      </div>
    </div>
  );
}
