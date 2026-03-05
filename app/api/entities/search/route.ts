import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entity_type");
  const q = searchParams.get("q")?.toLowerCase() ?? "";

  if (!entityType) {
    return NextResponse.json({ error: "entity_type required" }, { status: 400 });
  }

  type Result = { id: string; label: string; subtitle: string };
  let results: Result[] = [];

  if (entityType === "job") {
    const { data } = await admin
      .from("jobs")
      .select("id,job_title,status,scheduled_date,customers(first_name,last_name,company_name)")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false })
      .limit(40);
    results = (data ?? [])
      .map((j) => {
        const c = j.customers as { first_name?: string; last_name?: string; company_name?: string } | null;
        const cName = [c?.first_name, c?.last_name].filter(Boolean).join(" ") || c?.company_name || "";
        return {
          id: j.id,
          label: j.job_title ?? `Job #${j.id.slice(0, 8)}`,
          subtitle: [cName, j.status, j.scheduled_date ? new Date(j.scheduled_date).toLocaleDateString() : ""].filter(Boolean).join(" · "),
        };
      })
      .filter((r) => !q || r.label.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q));
  }

  if (entityType === "lead") {
    const { data } = await admin
      .from("leads")
      .select("id,name,phone,status")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false })
      .limit(40);
    results = (data ?? [])
      .map((l) => ({
        id: l.id,
        label: l.name,
        subtitle: [l.phone, l.status].filter(Boolean).join(" · "),
      }))
      .filter((r) => !q || r.label.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q));
  }

  if (entityType === "customer") {
    const { data } = await admin
      .from("customers")
      .select("id,first_name,last_name,company_name,phone")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false })
      .limit(40);
    results = (data ?? [])
      .map((c) => ({
        id: c.id,
        label: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "Unnamed",
        subtitle: c.phone ?? "",
      }))
      .filter((r) => !q || r.label.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q));
  }

  if (entityType === "quote") {
    const { data } = await admin
      .from("quotes")
      .select("id,status,total_amount,created_at,customers(first_name,last_name,company_name)")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false })
      .limit(40);
    results = (data ?? [])
      .map((q_item) => {
        const c = q_item.customers as { first_name?: string; last_name?: string; company_name?: string } | null;
        const cName = [c?.first_name, c?.last_name].filter(Boolean).join(" ") || c?.company_name || "";
        return {
          id: q_item.id,
          label: `Quote #${q_item.id.slice(0, 8).toUpperCase()}`,
          subtitle: [cName, `$${Number(q_item.total_amount).toLocaleString()}`, q_item.status].filter(Boolean).join(" · "),
        };
      })
      .filter((r) => !q || r.label.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q));
  }

  if (entityType === "invoice") {
    const { data } = await admin
      .from("invoices")
      .select("id,invoice_number,status,total_amount,customers(first_name,last_name,company_name)")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false })
      .limit(40);
    results = (data ?? [])
      .map((inv) => {
        const c = inv.customers as { first_name?: string; last_name?: string; company_name?: string } | null;
        const cName = [c?.first_name, c?.last_name].filter(Boolean).join(" ") || c?.company_name || "";
        return {
          id: inv.id,
          label: inv.invoice_number ?? `Invoice #${inv.id.slice(0, 8).toUpperCase()}`,
          subtitle: [cName, `$${Number(inv.total_amount).toLocaleString()}`, inv.status].filter(Boolean).join(" · "),
        };
      })
      .filter((r) => !q || r.label.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q));
  }

  return NextResponse.json(results.slice(0, 20));
}
