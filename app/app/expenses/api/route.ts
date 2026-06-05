import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("expenses")
    .select("id,vendor,description,receipt_date,total_amount,category,job_id,notes,created_at")
    .eq("org_id", orgId!)
    .order("receipt_date", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const body = await req.json() as {
    vendor: string;
    description?: string;
    amount: number;
    category?: string;
    expense_date?: string;
    job_id?: string | null;
    notes?: string;
  };

  if (!body.vendor?.trim()) {
    return NextResponse.json({ error: "Vendor is required" }, { status: 400 });
  }
  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("expenses")
    .insert({
      org_id: orgId!,
      vendor: body.vendor.trim(),
      description: body.description?.trim() || null,
      total_amount: body.amount,
      category: body.category || "other",
      receipt_date: body.expense_date || new Date().toISOString().slice(0, 10),
      notes: body.notes?.trim() || null,
      job_id: body.job_id || null,
      created_by_user: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    // Graceful fallback if category/description columns don't exist yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: data2, error: error2 } = await (admin as any)
      .from("expenses")
      .insert({
        org_id: orgId!,
        vendor: body.vendor.trim(),
        total_amount: body.amount,
        receipt_date: body.expense_date || new Date().toISOString().slice(0, 10),
        notes: body.notes ? `[${body.category || "other"}] ${body.description ? body.description + ". " : ""}${body.notes}` : (body.description ? `[${body.category || "other"}] ${body.description}` : null),
        job_id: body.job_id || null,
        created_by_user: user?.id ?? null,
      })
      .select("id")
      .single();

    if (error2) return NextResponse.json({ error: error2.message }, { status: 400 });

    void logActivity({
      orgId: orgId!,
      entityType: "expense",
      entityId: data2.id,
      action: "created",
      description: `Expense logged: ${body.vendor.trim()} $${body.amount.toFixed(2)}`,
      userId: user?.id,
    });

    return NextResponse.json({ id: data2.id });
  }

  void logActivity({
    orgId: orgId!,
    entityType: "expense",
    entityId: data.id,
    action: "created",
    description: `Expense logged: ${body.vendor.trim()} $${body.amount.toFixed(2)}`,
    userId: user?.id,
  });

  return NextResponse.json({ id: data.id });
}
