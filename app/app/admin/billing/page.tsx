import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { LogPaymentForm } from "./LogPaymentForm";
import { NotificationActions } from "./NotificationActions";

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function computeSubState(sub: any): { label: string; color: string } {
  if (!sub.next_due_date) return { label: "No record", color: "gray" };
  const now = new Date();
  const nextDue = new Date(sub.next_due_date);
  const graceEnd = new Date(sub.grace_period_end_date);
  if (sub.subscription_status === "canceled" && now > graceEnd) return { label: "Canceled", color: "gray" };
  if (now <= nextDue) return { label: "Active", color: "green" };
  if (now > nextDue && now <= graceEnd) {
    const days = Math.max(1, Math.ceil((graceEnd.getTime() - now.getTime()) / 86400000));
    return { label: `Grace — ${days}d left`, color: "amber" };
  }
  return { label: "Expired", color: "red" };
}

const STATUS_COLORS: Record<string, string> = {
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  gray: "bg-gray-100 text-gray-500",
};

const NOTIF_COLORS: Record<string, string> = {
  pending_review: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  ignored: "bg-gray-100 text-gray-400",
};

export default async function AdminBillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(user.email?.toLowerCase() ?? "")) {
    redirect("/app");
  }

  const admin = getAdmin();

  const [notifResult, subsResult, orgsResult, usersResult] = await Promise.all([
    (admin as any).from("payment_notifications").select("*").order("created_at", { ascending: false }).limit(200),
    (admin as any).from("subscriptions").select("*").order("created_at", { ascending: false }),
    (admin as any).from("orgs").select("id, name, owner_user_id"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const notifications: any[] = notifResult.data ?? [];
  const subscriptions: any[] = subsResult.data ?? [];
  const orgs: any[] = orgsResult.data ?? [];
  const allUsers: any[] = (usersResult.data as any)?.users ?? [];

  const userEmailMap: Record<string, string> = {};
  allUsers.forEach((u: any) => { userEmailMap[u.id] = u.email ?? ""; });

  const orgMap: Record<string, any> = {};
  orgs.forEach((o: any) => { orgMap[o.id] = o; });

  const pendingNotifs = notifications.filter((n) => n.status === "pending_review");
  const resolvedNotifs = notifications.filter((n) => n.status !== "pending_review");

  return (
    <div className="p-4 pb-24 space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Billing Admin</h1>

      {/* BILLING NOTIFICATIONS */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-700">Billing Notifications</h2>
          <LogPaymentForm />
        </div>

        {notifications.length === 0 && (
          <p className="text-sm text-gray-400 py-6 text-center">
            No payments logged yet. Tap "+ Log a Payment" to add one.
          </p>
        )}

        {pendingNotifs.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
              Pending Review ({pendingNotifs.length})
            </p>
            {pendingNotifs.map((n) => (
              <div key={n.id} className="border border-amber-200 rounded-xl p-4 space-y-3 bg-amber-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{n.payer_name}</p>
                    <p className="text-xs text-gray-500 truncate">{n.payer_email}</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                    Pending
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="block font-medium text-slate-500 mb-0.5">Plan</span>
                    <span className="text-gray-700 capitalize">{n.plan_type}</span>
                  </div>
                  <div>
                    <span className="block font-medium text-slate-500 mb-0.5">Amount</span>
                    <span className="text-gray-700">${Number(n.amount).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="block font-medium text-slate-500 mb-0.5">Date</span>
                    <span className="text-gray-700">{n.payment_date}</span>
                  </div>
                </div>
                {n.notes && (
                  <p className="text-xs text-gray-500 italic border-t border-amber-100 pt-2">"{n.notes}"</p>
                )}
                <NotificationActions id={n.id} payerEmail={n.payer_email} planType={n.plan_type} />
              </div>
            ))}
          </div>
        )}

        {resolvedNotifs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">
              Resolved ({resolvedNotifs.length})
            </p>
            {resolvedNotifs.map((n) => (
              <div key={n.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-700 text-sm">{n.payer_name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {n.payer_email} · ${Number(n.amount).toFixed(2)} · {n.payment_date}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${NOTIF_COLORS[n.status] ?? "bg-gray-100 text-gray-400"}`}>
                    {n.status === "approved" ? "Approved" : "Ignored"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ALL SUBSCRIPTIONS */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="text-base font-bold text-slate-700">All Subscriptions</h2>

        {subscriptions.length === 0 && (
          <p className="text-sm text-gray-400 py-6 text-center">No subscription records in the database yet.</p>
        )}

        {subscriptions.map((sub) => {
          const org = orgMap[sub.org_id];
          const ownerEmail = org ? (userEmailMap[org.owner_user_id] ?? "—") : "—";
          const { label, color } = computeSubState(sub);

          return (
            <div key={sub.id} className="border border-gray-100 rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-700 text-sm truncate">
                    {org?.name ?? "Unknown Org"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{ownerEmail}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[color]}`}>
                  {label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 border-t border-gray-50 pt-2">
                <div>
                  <span className="block font-medium text-slate-500 mb-0.5">Plan</span>
                  <span className="capitalize">{sub.plan_type}</span>
                </div>
                <div>
                  <span className="block font-medium text-slate-500 mb-0.5">Next Due</span>
                  {sub.next_due_date ? new Date(sub.next_due_date).toLocaleDateString() : "—"}
                </div>
                <div>
                  <span className="block font-medium text-slate-500 mb-0.5">Last Paid</span>
                  {sub.payment_date ? new Date(sub.payment_date).toLocaleDateString() : "—"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
