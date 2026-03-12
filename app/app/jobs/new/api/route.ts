import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const body = await req.json() as {
    customer_id: string;
    job_title: string;
    scheduled_date?: string;
    address?: string;
    notes?: string;
    new_customer?: { first_name: string; last_name: string; phone: string; email: string };
  };

  let customerId = body.customer_id;

  if (body.new_customer?.first_name) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: nc, error: ncErr } = await (admin as any)
      .from("customers")
      .insert({
        org_id: orgId!,
        first_name: body.new_customer.first_name.trim(),
        last_name: body.new_customer.last_name?.trim() || null,
        phone: body.new_customer.phone?.trim() || null,
        email: body.new_customer.email?.trim() || null,
      })
      .select("id")
      .single();

    if (ncErr) return NextResponse.json({ error: ncErr.message }, { status: 400 });
    customerId = nc.id;
  }

  if (!customerId) return NextResponse.json({ error: "Customer is required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job, error } = await (admin as any)
    .from("jobs")
    .insert({
      org_id: orgId!,
      customer_id: customerId,
      job_title: body.job_title,
      status: "scheduled",
      scheduled_date: body.scheduled_date || null,
      address: body.address || null,
      notes: body.notes || null,
      created_by_user: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: job.id });
}
