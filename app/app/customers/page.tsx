import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

async function createCustomer(formData: FormData) {
  "use server";
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: customer } = await admin.from("customers").insert({
    org_id: orgId!,
    first_name: String(formData.get("first_name") ?? ""),
    last_name: String(formData.get("last_name") ?? "") || null,
    company_name: String(formData.get("company_name") ?? "") || null,
    phone: String(formData.get("phone") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
    address_line1: String(formData.get("address_line1") ?? "") || null,
    city: String(formData.get("city") ?? "") || null,
    state: String(formData.get("state") ?? "") || null,
    zip: String(formData.get("zip") ?? "") || null,
    created_by_user: user.data.user?.id ?? null,
  }).select("id").single();
  if (customer) redirect(`/app/customers/${customer.id}`);
}

export default async function CustomersPage() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { data: customers } = await admin
    .from("customers").select("id,first_name,last_name,company_name,phone,email,created_at")
    .eq("org_id", orgId!).order("created_at", { ascending: false });

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold text-slate-800">Customers</h1>

      <details className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <summary className="px-4 py-3 text-sm font-semibold cursor-pointer text-[#1B3A6B] flex items-center gap-2">
          <span>+ New Customer</span>
        </summary>
        <div className="px-4 pb-4">
          <form action={createCustomer} className="space-y-3 pt-3 border-t">
            <div className="grid grid-cols-2 gap-2">
              <input name="first_name" required placeholder="First name *"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
              <input name="last_name" placeholder="Last name"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <input name="company_name" placeholder="Company name"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            <input name="phone" type="tel" placeholder="Phone"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            <input name="email" type="email" placeholder="Email"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            <input name="address_line1" placeholder="Address"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            <div className="grid grid-cols-3 gap-2">
              <input name="city" placeholder="City"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
              <input name="state" placeholder="State" maxLength={2}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
              <input name="zip" placeholder="ZIP"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <button type="submit"
              className="w-full rounded-xl py-3 text-white font-semibold text-sm"
              style={{ backgroundColor: "#1B3A6B" }}>
              Save Customer
            </button>
          </form>
        </div>
      </details>

      {!customers?.length ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">No customers yet.</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {customers.map(customer => {
            const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.company_name || "Unnamed";
            return (
              <Link key={customer.id} href={`/app/customers/${customer.id}`} className="flex items-center gap-3 px-4 py-3">
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: "#1B3A6B" }}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 text-sm">{name}</p>
                  <p className="text-xs text-gray-400">{customer.email ?? customer.phone ?? "No contact info"}</p>
                </div>
                <span className="text-gray-300">›</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
