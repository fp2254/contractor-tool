import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

async function updateLabor(formData: FormData) {
  "use server";
  const jobId = String(formData.get("job_id"));
  const laborMinutes = Number(formData.get("labor_minutes") || 0);
  const laborRate = Number(formData.get("labor_rate") || 0);
  const supabase = await createClient();
  const orgId = await ensureUserOrg();

  await supabase
    .from("jobs")
    .update({ labor_minutes: laborMinutes || null, labor_rate: laborRate || null })
    .eq("id", jobId)
    .eq("org_id", orgId!);

  revalidatePath(`/app/jobs/${jobId}`);
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const orgId = await ensureUserOrg();

  const [{ data: job }, { data: materials }] = await Promise.all([
    supabase.from("jobs").select("*").eq("org_id", orgId!).eq("id", id).maybeSingle(),
    supabase.from("job_materials").select("cost,quantity").eq("org_id", orgId!).eq("job_id", id),
  ]);

  if (!job) return notFound();

  let revenue = 0;
  if (job.invoice_id) {
    const { data: inv } = await supabase.from("invoices").select("total_amount").eq("org_id", orgId!).eq("id", job.invoice_id).maybeSingle();
    revenue = Number(inv?.total_amount ?? 0);
  }

  const materialsTotal = (materials ?? []).reduce((sum, m) => sum + Number(m.cost ?? 0) * Number(m.quantity ?? 0), 0);

  const derivedLaborMinutes =
    job.started_at && job.completed_at
      ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 60000)
      : null;

  const laborMinutes = Number(job.labor_minutes ?? derivedLaborMinutes ?? 0);
  const laborRate = Number(job.labor_rate ?? 0);
  const laborCost = laborMinutes > 0 && laborRate > 0 ? (laborMinutes / 60) * laborRate : 0;

  const profitEstimate = revenue - materialsTotal;


  return (
    <div className="grid gap-4">
      <Card title={job.job_title}>
        <p className="text-sm text-slate-600">Status: {job.status}</p>
      </Card>

      <Card title="Profit Snapshot">
        <p>Revenue: ${revenue.toFixed(2)}</p>
        <p>Materials: ${materialsTotal.toFixed(2)}</p>
        <p>Labor Minutes: {laborMinutes || 0}</p>
        <p>Labor Cost (Phase 2.2 preview): ${laborCost.toFixed(2)}</p>
        <p className="mt-2 font-semibold">Profit estimate (MVP): ${(profitEstimate).toFixed(2)}</p>
      </Card>

      <Card title="Edit Labor Minutes">
        <form action={updateLabor} className="grid gap-2">
          <input type="hidden" name="job_id" value={job.id} />
          <Input name="labor_minutes" type="number" min="0" defaultValue={job.labor_minutes ?? derivedLaborMinutes ?? 0} />
          <Input name="labor_rate" type="number" min="0" step="0.01" defaultValue={job.labor_rate ?? 0} />
          <Button type="submit">Save Labor</Button>
        </form>
      </Card>
    </div>
  );
}
