import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

async function upsertMembership(admin: any, orgId: string, data: Record<string, any>) {
  const { data: existing } = await admin
    .from("org_memberships")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    const { data: updated, error } = await admin
      .from("org_memberships")
      .update({ ...data, updated_at: now })
      .eq("org_id", orgId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  } else {
    const { data: created, error } = await admin
      .from("org_memberships")
      .insert({ org_id: orgId, ...data, started_at: now, created_at: now, updated_at: now })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return created;
  }
}

async function logEvent(admin: any, orgId: string, membershipId: string | null, eventType: string, fields: Record<string, any>) {
  await admin.from("membership_events").insert({
    org_id: orgId,
    org_membership_id: membershipId ?? null,
    event_type: eventType,
    created_at: new Date().toISOString(),
    ...fields,
  });
}

export async function GET(_req: Request, { params }: Params) {
  await requirePlatformAdmin();
  const { id: orgId } = await params;
  const admin = createAdminClient();

  const [memRes, eventsRes] = await Promise.all([
    (admin as any).from("org_memberships").select("*").eq("org_id", orgId).maybeSingle(),
    (admin as any).from("membership_events").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(50),
  ]);

  return NextResponse.json({ membership: memRes.data, events: eventsRes.data ?? [] });
}

export async function PATCH(req: Request, { params }: Params) {
  const actor = await requirePlatformAdmin();
  const { id: orgId } = await params;
  const admin = createAdminClient();
  const body = await req.json() as any;
  const { action, actorEmail = actor.email } = body;

  const { data: existingMem } = await (admin as any)
    .from("org_memberships")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  const now = new Date();

  let updateData: Record<string, any> = {};
  let eventType = action;
  let eventFields: Record<string, any> = { actor_email: actorEmail, actor_user_id: actor.id };

  try {
    switch (action) {
      case "cancel":
        updateData = { status: "canceled", canceled_at: now.toISOString() };
        eventFields = { ...eventFields, old_status: existingMem?.status, new_status: "canceled" };
        break;

      case "reactivate":
      case "mark_active":
        updateData = { status: "active", canceled_at: null, paused_at: null };
        eventFields = { ...eventFields, old_status: existingMem?.status, new_status: "active" };
        break;

      case "pause":
        updateData = { status: "paused", paused_at: now.toISOString() };
        eventFields = { ...eventFields, old_status: existingMem?.status, new_status: "paused" };
        break;

      case "mark_past_due":
        updateData = { status: "past_due" };
        eventFields = { ...eventFields, old_status: existingMem?.status, new_status: "past_due" };
        break;

      case "extend": {
        const days = Number(body.days ?? 30);
        const base = existingMem?.current_period_end ? new Date(existingMem.current_period_end) : now;
        if (base < now) base.setTime(now.getTime());
        base.setDate(base.getDate() + days);
        updateData = { status: existingMem?.status === "canceled" || !existingMem?.status ? "active" : existingMem.status, current_period_end: base.toISOString(), current_period_start: existingMem?.current_period_start ?? now.toISOString() };
        eventFields = { ...eventFields, days_added: days, note: `Extended by ${days} days` };
        break;
      }

      case "comp": {
        const days = Number(body.days ?? 30);
        const compEnd = new Date(now);
        compEnd.setDate(compEnd.getDate() + days);
        updateData = { status: "comped", comped_until: compEnd.toISOString() };
        eventFields = { ...eventFields, days_added: days, old_status: existingMem?.status, new_status: "comped", note: `Comped for ${days} days` };
        break;
      }

      case "comp_indefinitely":
        updateData = { status: "comped", comped_until: null };
        eventFields = { ...eventFields, old_status: existingMem?.status, new_status: "comped", note: "Comped indefinitely" };
        break;

      case "change_plan":
        updateData = { plan: body.plan };
        eventFields = { ...eventFields, old_plan: existingMem?.plan, new_plan: body.plan };
        break;

      case "change_status":
        updateData = { status: body.newStatus };
        eventFields = { ...eventFields, old_status: existingMem?.status, new_status: body.newStatus };
        break;

      case "add_note":
        updateData = { admin_notes: body.note ?? "" };
        eventFields = { ...eventFields, note: body.note ?? "" };
        break;

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const updated = await upsertMembership(admin as any, orgId, updateData);
    await logEvent(admin as any, orgId, updated?.id ?? null, eventType, eventFields);

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed" }, { status: 500 });
  }
}
