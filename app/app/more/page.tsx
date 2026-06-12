import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/admin";
import { getUserOrgRole } from "@/lib/orgRole";
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

  const businessHref    = showcaseSlug ? `/pro/${showcaseSlug}` : "/app/profile/public-profile";
  const showcaseHref    = showcaseSlug ? `/showcase/${showcaseSlug}` : "/app/profile/public-profile";

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-800 mb-4">More</h1>

      {/* My Pages — two prominent buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link href={businessHref}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-4 px-3 text-white shadow-sm"
          style={{ backgroundColor: "#1B3A6B" }}>
          <span className="text-2xl">🏢</span>
          <span className="text-[13px] font-bold">My Business Page</span>
          <span className="text-[10px] opacity-70">{showcaseSlug ? `/pro/${showcaseSlug}` : "Set up first"}</span>
        </Link>
        <Link href={showcaseHref}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-4 px-3 shadow-sm border border-purple-200 bg-gradient-to-b from-purple-50 to-white">
          <span className="text-2xl">✨</span>
          <span className="text-[13px] font-bold text-purple-700">My Portfolio</span>
          <span className="text-[10px] text-purple-400">{showcaseSlug ? `/showcase/${showcaseSlug}` : "Set up first"}</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
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
