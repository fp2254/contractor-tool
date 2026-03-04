import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import { customerSchema } from "@/lib/validation";

async function createCustomer(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const orgId = await ensureUserOrg();
  const user = await supabase.auth.getUser();

  const parsed = customerSchema.parse({
    first_name: String(formData.get("first_name") ?? ""),
    last_name: String(formData.get("last_name") ?? ""),
    company_name: String(formData.get("company_name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    address_line1: String(formData.get("address_line1") ?? ""),
    city: String(formData.get("city") ?? ""),
    state: String(formData.get("state") ?? ""),
    zip: String(formData.get("zip") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  await supabase.from("customers").insert({ ...parsed, org_id: orgId!, created_by_user: user.data.user?.id ?? null });
  revalidatePath("/app/customers");
}

export default async function CustomersPage() {
  const supabase = await createClient();
  const orgId = await ensureUserOrg();

  const { data: customers } = await supabase
    .from("customers")
    .select("id,first_name,last_name,company_name,phone,email,created_at")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: false });

  return (
    <div className="grid gap-4">
      <Card title="New Customer">
        <form action={createCustomer} className="grid gap-2">
          <Input name="first_name" placeholder="First name" required />
          <Input name="last_name" placeholder="Last name" />
          <Input name="company_name" placeholder="Company name" />
          <Input name="phone" placeholder="Phone" />
          <Input name="email" placeholder="Email" type="email" />
          <Input name="address_line1" placeholder="Address" />
          <div className="grid grid-cols-3 gap-2">
            <Input name="city" placeholder="City" />
            <Input name="state" placeholder="State" />
            <Input name="zip" placeholder="ZIP" />
          </div>
          <Input name="notes" placeholder="Notes" />
          <Button type="submit">Create Customer</Button>
        </form>
      </Card>
      <Card title="Customers">
        <div className="space-y-2">
          {customers?.map((customer) => (
            <Link key={customer.id} href={`/app/customers/${customer.id}`} className="block rounded-lg bg-slate-100 p-3">
              <p className="font-semibold">{[customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.company_name || "Unnamed"}</p>
              <p className="text-sm text-slate-600">{customer.email ?? customer.phone ?? "No contact info"}</p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
