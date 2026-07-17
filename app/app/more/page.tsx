import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/admin";
import { getUserOrgRole } from "@/lib/orgRole";
import { ensureUserOrg } from "@/lib/auth";
import { redirect } from "next/navigation";
import InstallPrompt from "@/components/InstallPrompt";
import { WebsiteToggle } from "./WebsiteToggle";

const MENU_ITEMS = [
  { label: "Leads",              href: "/app/leads",             emoji: "🎯", color: "#F97316" },
  { label: "Quote Requests",     href: "/app/requests",          emoji: "📬", color: "#F97316" },
  { label: "AI Phone",           href: "/app/phone",             emoji: "📞", color: "#1B3A6B" },
  { label: "Schedule",           href: "/app/schedule",          emoji: "📅", color: "#1B3A6B" },
  { label: "Expenses",           href: "/app/expenses",          emoji: "💸", color: "#16A34A" },
  { label: "Scan Receipt",       href: "/app/receipts",          emoji: "🧾", color: "#16A34A" },
  { label: "Activity Log",       href: "/app/activity",          emoji: "📋", color: "#1B3A6B" },
  { label: "Customize Sidebar",  href: "/app/more/sidebar",      emoji: "📌", color: "#1B3A6B" },
  { label: "My Reviews",         href: "/app/reviews",           emoji: "⭐", color: "#F59E0B" },
  { label: "Find Contractors",   href: "/find-contractors",      emoji: "🔍", color: "#1B3A6B" },
  { label: "Earn With TradeBase",href: "/app/referral",          emoji: "💰", color: "#16A34A" },
  { label: "Realtor Requests",   href: "/app/realtor-requests",  emoji: "🏡", color: "#1B3A6B" },
  { label: "Team",               href: "/app/team",              emoji: "🧑‍🤝‍🧑", color: "#1B3A6B" },
  { label: "Trade Contacts",     href: "/app/trade-contacts",    emoji: "👥", color: "#1B3A6B" },
  { label: "Inventory",          href: "/app/inventory",         emoji: "📦", color: "#8B4513" },
  { label: "Completed Projects", href: "/app/projects",          emoji: "🏗️", color: "#1B3A6B" },
  { label: "Reports",            href: "/app/reports",           emoji: "📊", color: "#1B3A6B" },
  { label: "Accounting Export",  href: "/app/export",            emoji: "📤", color: "#16A34A" },
  { label: "Setup Wizard",       href: "/app/onboarding?redo=1", emoji: "🧭", color: "#1B3A6B" },
  { label: "Edit Your Profile",  href: "/app/profile/public-profile", emoji: "🌐", color: "#1B3A6B" },
  { label: "Settings",           href: "/app/profile",           emoji: "⚙️", color: "#6B7280" },
  { label: "App Settings",       href: "/app/settings",          emoji: "🔧", color: "#6B7280" },
  { label: "Support",            href: "/app/support",           emoji: "❓", color: "#6B7280" },
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

  let showcaseSlug: string | null = null;
  let websiteUrl: string | null = null;
  let preferredSource: "external" | "tradebase" | null = null;

  try {
    const orgId = await ensureUserOrg();
    const admin = createAdminClient() as any;
    const [pubResult, settingsResult] = await Promise.all([
      admin.from("public_profiles").select("slug").eq("org_id", orgId!).maybeSingle(),
      admin.from("org_settings").select("website,preferred_website_source").eq("org_id", orgId!).maybeSingle(),
    ]);
    showcaseSlug = pubResult.data?.slug ?? null;
    websiteUrl = (settingsResult.data as any)?.website ?? null;
    preferredSource = (settingsResult.data as any)?.preferred_website_source ?? null;

    if (!showcaseSlug && orgId) {
      const { data: org } = await admin.from("orgs").select("name").eq("id", orgId).maybeSingle();
      const orgName: string = org?.name ?? "contractor";
      const base = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "contractor";
      let slug = base.slice(0, 80);
      let attempt = 0;
      while (attempt < 25) {
        const { data: taken } = await admin.from("public_profiles").select("org_id").eq("slug", slug).maybeSingle();
        if (!taken) break;
        attempt++;
        slug = `${base.slice(0, 75)}-${attempt}`;
      }
      const { error: insertErr } = await admin
        .from("public_profiles")
        .insert({ org_id: orgId, slug, is_published: false });
      if (!insertErr) showcaseSlug = slug;
    }
  } catch { /* ignore */ }

  // Normalize external URL so it always opens as an external link
  const normalizedWebsiteUrl = websiteUrl
    ? /^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`
    : null;

  const proHref = showcaseSlug ? `/pro/${showcaseSlug}` : "/app/profile/public-profile";
  const showcaseHref = showcaseSlug ? `/showcase/${showcaseSlug}` : "/app/profile/public-profile";

  // Default: if they have an external site, default to "external"; otherwise "tradebase"
  const initialSource: "external" | "tradebase" =
    preferredSource ?? (normalizedWebsiteUrl ? "external" : "tradebase");

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-800 mb-4">More</h1>

      {!showcaseSlug && (
        <Link href="/app/profile/public-profile"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4 text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, #1B3A6B 0%, #2d5aa0 100%)" }}>
          <span className="text-2xl shrink-0">🌐</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">You don&apos;t have a public page yet</p>
            <p className="text-[11px] opacity-70 mt-0.5">Set up your free contractor profile — get found by homeowners</p>
          </div>
          <span className="text-white/60 text-lg shrink-0">›</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <WebsiteToggle
          initialSource={initialSource}
          externalUrl={normalizedWebsiteUrl}
          tradebaseUrl={proHref}
          tradebaseLabel={showcaseSlug ? `/pro/${showcaseSlug}` : "Set up first"}
        />
        <Link href={showcaseHref}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-4 px-3 shadow-sm border border-purple-200 bg-gradient-to-b from-purple-50 to-white">
          <span className="text-2xl">✨</span>
          <span className="text-[13px] font-bold text-purple-700">Project Showcase</span>
          <span className="text-[10px] text-purple-400">{showcaseSlug ? `/showcase/${showcaseSlug}` : "Set up first"}</span>
        </Link>
      </div>

      <InstallPrompt />

      <div className="grid grid-cols-2 gap-3">
        {MENU_ITEMS.map((item) => (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-3 bg-white rounded-2xl px-3 py-3.5 shadow-sm">
            <div className="h-9 w-9 rounded-full flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: item.color + "18" }}>
              {item.emoji}
            </div>
            <span className="text-[13px] font-semibold text-slate-700 leading-tight">{item.label}</span>
          </Link>
        ))}

        <Link href="/app/templates"
          className="flex items-center gap-3 bg-white rounded-2xl px-3 py-3.5 shadow-sm">
          <div className="h-9 w-9 rounded-full flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: "#1B3A6B18" }}>
            🗂️
          </div>
          <div className="min-w-0">
            <span className="text-[13px] font-semibold text-slate-700 leading-tight">Job Templates</span>
            <span className="block text-[10px] font-bold text-amber-600 mt-0.5">Coming soon</span>
          </div>
        </Link>

        {isAdmin && (
          <Link href="/app/admin"
            className="flex items-center gap-3 bg-amber-50 rounded-2xl px-3 py-3.5 shadow-sm">
            <div className="h-9 w-9 rounded-full flex items-center justify-center text-lg shrink-0 bg-amber-100">
              🛡️
            </div>
            <div className="min-w-0">
              <span className="text-[13px] font-semibold text-amber-700 leading-tight">Platform Admin</span>
              <span className="block text-[10px] font-bold text-amber-500 mt-0.5 uppercase">Internal</span>
            </div>
          </Link>
        )}

        <form action={signOut} className="contents">
          <button type="submit" className="flex items-center gap-3 bg-white rounded-2xl px-3 py-3.5 shadow-sm text-left w-full">
            <div className="h-9 w-9 rounded-full flex items-center justify-center bg-red-50 text-lg shrink-0">🔴</div>
            <span className="text-[13px] font-semibold text-red-500">Log Out</span>
          </button>
        </form>
      </div>
    </div>
  );
}
