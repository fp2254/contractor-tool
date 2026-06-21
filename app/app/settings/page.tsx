import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { listOrgAddons } from "@/lib/addons";
import Link from "next/link";
import { SquareConnectSection } from "./SquareConnectSection";
import { PaymentLinksCard } from "./PaymentLinksCard";
import { BillingCard } from "@/components/BillingCard";

async function changePassword(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const password = String(formData.get("password") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (!password || password !== confirm) return;
  await supabase.auth.updateUser({ password });
}

function formatPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const n = digits.slice(1);
    return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
  }
  return e164;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const { data: settings } = await (admin as any)
    .from("org_settings")
    .select("square_access_token, square_merchant_id, square_location_id, payment_links")
    .eq("org_id", orgId!)
    .maybeSingle();

  const squareConnected = !!settings?.square_access_token;
  const squareAlert = params.square ?? null;
  const paymentLinks = (settings?.payment_links as Record<string, string>) ?? {};

  const orgAddons = orgId ? await listOrgAddons(orgId) : [];
  const phoneAddon = orgAddons.find((a) => a.addonType === "phone_ai") ?? null;
  const phoneActive = phoneAddon?.active ?? false;

  let phoneNumber: string | null = null;
  if (phoneActive && orgId) {
    const { data: phoneRow } = await (admin as any)
      .from("org_phone_numbers")
      .select("e164_number")
      .eq("org_id", orgId)
      .maybeSingle();
    phoneNumber = (phoneRow as any)?.e164_number ?? null;
  }

  const billingAddons = orgAddons.filter((a) => a.active);

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Settings</h1>

      {/* ACCOUNT */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Account</p>
        </div>
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-slate-500">Email</span>
          <span className="text-sm font-medium text-slate-700">{user.email}</span>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-slate-700 mb-3">Change Password</p>
          <form action={changePassword} className="space-y-2">
            <input
              name="password"
              type="password"
              placeholder="New password"
              minLength={6}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <input
              name="confirm"
              type="password"
              placeholder="Confirm new password"
              minLength={6}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: "#1B3A6B" }}>
              Update Password
            </button>
          </form>
        </div>
      </div>

      {/* INTEGRATIONS */}
      <SquareConnectSection connected={squareConnected} alert={squareAlert} merchantId={settings?.square_merchant_id ?? null} />

      {/* PHONE & AI RECEPTIONIST */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Add-ons</p>
        </div>
        <Link href="/app/phone" className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📞</span>
            <div>
              <p className="text-sm font-semibold text-slate-800">Phone & AI Receptionist</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {phoneActive && phoneNumber
                  ? `Active — ${formatPhone(phoneNumber)}`
                  : phoneActive
                  ? "Active — dedicated business number + AI answers missed calls"
                  : "Get a dedicated number and AI that answers for you — $29/mo"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {phoneActive ? (
              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Active</span>
            ) : (
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">$29/mo</span>
            )}
            <span className="text-gray-300 text-lg">›</span>
          </div>
        </Link>
      </div>

      {/* BILLING */}
      {billingAddons.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Billing</p>
          </div>
          {billingAddons.map((addon, i) => (
            <BillingCard
              key={addon.addonType}
              addonName={addon.addonName}
              addonType={addon.addonType}
              currentPeriodEnd={addon.currentPeriodEnd}
              priceMonthly={addon.priceMonthly}
              status={addon.status}
              hasSubscriptionId={!!addon.externalSubscriptionId}
              standalone={false}
              borderTop={i > 0}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Billing</p>
          </div>
          <div className="px-4 py-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">No active plans</p>
              <p className="text-xs text-gray-400 mt-0.5">Add-ons will appear here once subscribed</p>
            </div>
            <Link
              href="/app/phone"
              className="text-xs font-semibold text-[#1B3A6B] bg-blue-50 px-3 py-1.5 rounded-full whitespace-nowrap">
              View Add-ons
            </Link>
          </div>
        </div>
      )}

      {/* PAYMENT LINKS */}
      <PaymentLinksCard squareConnected={squareConnected} initial={paymentLinks} />

      {/* APP */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">App</p>
        </div>
        <Link href="/app/profile/public-profile"
          className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <span className="text-sm font-medium text-slate-700">My Public Profile</span>
          <span className="text-gray-300 text-lg">›</span>
        </Link>
        <Link href="/app/profile"
          className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <span className="text-sm font-medium text-slate-700">Settings</span>
          <span className="text-gray-300 text-lg">›</span>
        </Link>
        <Link href="/app/support"
          className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <span className="text-sm font-medium text-slate-700">Support</span>
          <span className="text-gray-300 text-lg">›</span>
        </Link>
        <div className="flex items-center justify-between px-4 py-4">
          <span className="text-sm text-slate-500">Version</span>
          <span className="text-sm text-gray-400">1.0.0</span>
        </div>
      </div>

      {/* LEGAL */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Legal</p>
        </div>
        <Link href="/terms" target="_blank"
          className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <span className="text-sm font-medium text-slate-700">Terms of Service</span>
          <span className="text-gray-300 text-lg">›</span>
        </Link>
        <Link href="/privacy" target="_blank"
          className="flex items-center justify-between px-4 py-4">
          <span className="text-sm font-medium text-slate-700">Privacy Policy</span>
          <span className="text-gray-300 text-lg">›</span>
        </Link>
      </div>
    </div>
  );
}
