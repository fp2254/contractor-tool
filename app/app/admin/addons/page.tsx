import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activateAddon, deactivateAddon } from "@/lib/addons";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const adminEmails = (process.env.ADMIN_EMAIL ?? "").split(",").map((e) => e.trim().toLowerCase());
  if (!adminEmails.includes(user.email?.toLowerCase() ?? "")) redirect("/app");
  return user;
}

async function activateAction(formData: FormData) {
  "use server";
  await assertAdmin();
  const orgId = String(formData.get("org_id") ?? "").trim();
  const addonType = String(formData.get("addon_type") ?? "phone_ai").trim();
  if (!orgId) return;
  await activateAddon(orgId, addonType, { priceMonthly: 29, periodDays: 30 });
  revalidatePath("/app/admin/addons");
}

async function deactivateAction(formData: FormData) {
  "use server";
  await assertAdmin();
  const orgId = String(formData.get("org_id") ?? "").trim();
  const addonType = String(formData.get("addon_type") ?? "phone_ai").trim();
  if (!orgId) return;
  await deactivateAddon(orgId, addonType);
  revalidatePath("/app/admin/addons");
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trialing: "bg-blue-100 text-blue-700",
  canceled: "bg-gray-100 text-gray-500",
  paused: "bg-amber-100 text-amber-700",
  none: "bg-gray-50 text-gray-400",
};

export default async function AdminAddonsPage() {
  await assertAdmin();
  const admin = createAdminClient();

  // Get all orgs with their add-on status
  const [{ data: orgs }, { data: addons }] = await Promise.all([
    (admin as any).from("orgs").select("id,name").order("name"),
    (admin as any).from("org_addons").select("*").eq("addon_type", "phone_ai"),
  ]);

  // Get any pending addon requests from support tickets
  const { data: requests } = await (admin as any)
    .from("support_tickets")
    .select("id,org_id,created_at,body")
    .like("subject", "[ADDON_REQUEST]%")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(20);

  const addonMap = new Map<string, any>();
  for (const a of addons ?? []) addonMap.set(a.org_id, a);

  function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <a href="/app/admin" className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <h1 className="text-xl font-bold text-slate-800">Add-on Management</h1>
      </div>

      {/* Pending requests */}
      {requests && requests.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-amber-600 uppercase mb-2">⚠ Pending Requests ({requests.length})</p>
          <div className="space-y-2">
            {requests.map((r: any) => {
              const orgName = orgs?.find((o: any) => o.id === r.org_id)?.name ?? r.org_id;
              return (
                <div key={r.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                  <p className="text-sm font-medium text-amber-800">{orgName}</p>
                  <p className="text-xs text-amber-600 mt-0.5">{fmtDate(r.created_at)}</p>
                  <form action={activateAction} className="mt-2">
                    <input type="hidden" name="org_id" value={r.org_id} />
                    <input type="hidden" name="addon_type" value="phone_ai" />
                    <button type="submit"
                      className="text-xs font-semibold text-white bg-[#1B3A6B] px-4 py-1.5 rounded-xl">
                      Activate Phone Add-on
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All orgs */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase">AI Phone Add-on — All Orgs</p>
        </div>
        <div className="divide-y divide-gray-100">
          {(orgs ?? []).map((org: any) => {
            const addon = addonMap.get(org.id);
            const status: string = addon?.status ?? "none";
            const isActive = status === "active" || status === "trialing";
            return (
              <div key={org.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{org.name}</p>
                  <p className="text-xs text-gray-400">{addon ? `Activated ${fmtDate(addon.activated_at)}` : "Not subscribed"}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_STYLE[status] ?? STATUS_STYLE.none}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
                {isActive ? (
                  <form action={deactivateAction}>
                    <input type="hidden" name="org_id" value={org.id} />
                    <input type="hidden" name="addon_type" value="phone_ai" />
                    <button type="submit" className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
                      Cancel
                    </button>
                  </form>
                ) : (
                  <form action={activateAction}>
                    <input type="hidden" name="org_id" value={org.id} />
                    <input type="hidden" name="addon_type" value="phone_ai" />
                    <button type="submit" className="text-xs font-semibold text-white bg-[#1B3A6B] px-3 py-1.5 rounded-xl">
                      Activate
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
