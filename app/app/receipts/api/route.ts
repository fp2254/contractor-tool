import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

export async function GET() {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("expenses")
    .select("id,vendor,receipt_date,total_amount,job_id,created_at,line_items")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  const body = await req.json() as {
    vendor: string;
    receipt_date?: string;
    subtotal?: number;
    tax_amount?: number;
    total_amount: number;
    notes?: string;
    job_id?: string | null;
    line_items?: unknown[];
  };

  const { data, error } = await admin
    .from("expenses")
    .insert({
      org_id: orgId!,
      vendor: body.vendor || "Unknown Vendor",
      receipt_date: body.receipt_date || null,
      subtotal: body.subtotal ?? null,
      tax_amount: body.tax_amount ?? null,
      total_amount: body.total_amount ?? 0,
      notes: body.notes || null,
      job_id: body.job_id || null,
      line_items: body.line_items ?? null,
      created_by_user: user?.id ?? null,
    } as Record<string, unknown>)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not save expense" }, { status: 400 });
  }
  return NextResponse.json({ id: data.id });
}
