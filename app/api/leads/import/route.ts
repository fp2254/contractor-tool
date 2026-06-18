import { NextResponse } from "next/server";
import { ensureUserOrg } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { leads } = await req.json() as {
    leads: {
      name: string;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
      state?: string;
      job_type?: string;
      notes?: string;
    }[];
  };

  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: "No leads provided" }, { status: 400 });
  }

  const rows = leads
    .filter(l => l.name?.trim())
    .map(l => ({
      org_id: orgId!,
      name: l.name.trim(),
      phone: l.phone?.trim() || null,
      email: l.email?.trim() || null,
      address: l.address?.trim() || null,
      city: l.city?.trim() || null,
      state: l.state?.trim() || null,
      job_type: l.job_type?.trim() || null,
      notes: l.notes?.trim() || null,
      lead_source: "Import",
      status: "new",
      created_by_user: user?.id ?? null,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid leads to import" }, { status: 400 });
  }

  const { data, error } = await admin.from("leads").insert(rows).select("id");

  if (error) {
    console.error("[leads/import]", error);
    return NextResponse.json({ error: "Failed to import leads" }, { status: 500 });
  }

  return NextResponse.json({ count: data?.length ?? 0 });
}
