import { revalidatePath } from "next/cache";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

async function sendReminder(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const orgId = await ensureUserOrg();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const quoteId = String(formData.get("quote_id"));
  const customerId = String(formData.get("customer_id"));
  const channel = String(formData.get("channel") || "sms");

  if (!user || !orgId) return;

  await supabase.from("followups").insert({
    org_id: orgId,
    created_by: user.id,
    quote_id: quoteId,
    customer_id: customerId,
    scheduled_for: new Date().toISOString(),
    status: "sent",
    channel,
    sent_at: new Date().toISOString(),
  });

  await logActivity({
    entity_type: "quote",
    entity_id: quoteId,
    action: "followup_sent",
    description: "Follow-up reminder sent",
  });

  revalidatePath("/app/followups");
  revalidatePath("/app");
}

async function skipReminder(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const orgId = await ensureUserOrg();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const quoteId = String(formData.get("quote_id"));
  const customerId = String(formData.get("customer_id"));

  if (!user || !orgId) return;

  await supabase.from("followups").insert({
    org_id: orgId,
    created_by: user.id,
    quote_id: quoteId,
    customer_id: customerId,
    scheduled_for: new Date().toISOString(),
    status: "skipped",
    channel: "sms",
  });

  await logActivity({
    entity_type: "quote",
    entity_id: quoteId,
    action: "followup_skipped",
    description: "Follow-up skipped",
  });

  revalidatePath("/app/followups");
  revalidatePath("/app");
}

export default async function FollowupsPage() {
  const supabase = await createClient();
  const orgId = await ensureUserOrg();
  const followupCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id,customer_id,total_amount,sent_at,status,customers(first_name,last_name,city)")
    .eq("org_id", orgId!)
    .eq("status", "sent")
    .lte("sent_at", followupCutoff)
    .is("accepted_at", null)
    .is("declined_at", null)
    .order("sent_at", { ascending: true });

  return (
    <Card title="Quote Follow-Ups">
      <div className="space-y-3">
        {quotes?.map((quote) => {
          const sentAt = quote.sent_at ? new Date(quote.sent_at) : new Date();
          const days = Math.max(0, Math.floor((Date.now() - sentAt.getTime()) / (24 * 60 * 60 * 1000)));
          const customer = Array.isArray(quote.customers) ? quote.customers[0] : quote.customers;
          const customerName = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Customer";
          return (
            <div key={quote.id} className="rounded-xl bg-slate-100 p-3">
              <p className="font-semibold">{customerName}</p>
              <p className="text-sm text-slate-600">{customer?.city ?? "Unknown town"}</p>
              <p className="text-sm">Quote ${quote.total_amount} · {days} days since sent</p>
              <div className="mt-2 flex gap-2">
                <form action={sendReminder}>
                  <input type="hidden" name="quote_id" value={quote.id} />
                  <input type="hidden" name="customer_id" value={quote.customer_id} />
                  <input type="hidden" name="channel" value="sms" />
                  <Button type="submit">Send Reminder</Button>
                </form>
                <form action={skipReminder}>
                  <input type="hidden" name="quote_id" value={quote.id} />
                  <input type="hidden" name="customer_id" value={quote.customer_id} />
                  <Button type="submit" variant="secondary">Skip</Button>
                </form>
              </div>
            </div>
          );
        })}
        {quotes?.length === 0 ? <p className="text-sm text-slate-600">No quotes currently need follow-up.</p> : null}
      </div>
    </Card>
  );
}
