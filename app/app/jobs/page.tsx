import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import { jobSchema } from "@/lib/validation";

async function createJob(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const orgId = await ensureUserOrg();
  const user = await supabase.auth.getUser();

  const parsed = jobSchema.parse({
    customer_id: String(formData.get("customer_id")),
    job_title: String(formData.get("job_title")),
    status: String(formData.get("status")),
    scheduled_date: String(formData.get("scheduled_date") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  await supabase.from("jobs").insert({ ...parsed, org_id: orgId!, created_by_user: user.data.user?.id ?? null });
  revalidatePath("/app/jobs");
}

export default async function JobsPage() {
  const supabase = await createClient();
  const orgId = await ensureUserOrg();
  const [{ data: jobs }, { data: customers }] = await Promise.all([
    supabase.from("jobs").select("id,job_title,status,scheduled_date").eq("org_id", orgId!),
    supabase.from("customers").select("id,first_name,last_name,company_name").eq("org_id", orgId!),
  ]);

  return (
    <div className="grid gap-4">
      <Card title="New Job">
        <form action={createJob} className="grid gap-2">
          <select name="customer_id" className="rounded-xl border px-4 py-3" required>
            {customers?.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {[customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.company_name || "Unnamed"}
              </option>
            ))}
          </select>
          <Input name="job_title" placeholder="Job title" required />
          <select name="status" className="rounded-xl border px-4 py-3" defaultValue="scheduled">
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Input name="scheduled_date" type="date" />
          <Input name="notes" placeholder="Notes" />
          <Button type="submit">Create Job</Button>
        </form>
      </Card>
      <Card title="Jobs">
        <div className="space-y-2">
          {jobs?.map((job) => (
            <Link key={job.id} href={`/app/jobs/${job.id}`} className="block rounded-lg bg-slate-100 p-3">
              <p className="font-medium">{job.job_title}</p>
              <p className="text-sm text-slate-600">{job.status}</p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
