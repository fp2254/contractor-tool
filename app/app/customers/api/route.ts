import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const body = await req.json() as Record<string, string>;

  const { data, error } = await admin
    .from("customers")
    .insert({
      org_id: orgId!,
      first_name: body.first_name ?? "",
      last_name: body.last_name || null,
      company_name: body.company_name || null,
      phone: body.phone || null,
      email: body.email || null,
      address_line1: body.address_line1 || null,
      city: body.city || null,
      state: body.state || null,
      created_by_user: user.data.user?.id ?? null,
    })
    .select("id,first_name,last_name,company_name,phone,email,address_line1,city,state,created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create client" }, { status: 400 });
  }

  return NextResponse.json({
    ...data,
    lifetimeValue: 0,
    lastJobDate: null,
    hasOverdue: false,
    hasUpcomingJob: false,
    hasQuotePending: false,
  });
}
