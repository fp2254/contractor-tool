import { createAdminClient } from "@/lib/supabase/admin";
import SetupChecklistCard, { type ChecklistStep } from "./SetupChecklistCard";

export default async function SetupChecklist({ orgId }: { orgId: string }) {
  const admin = createAdminClient();

  const [
    { data: orgSettings },
    { count: presetCount },
    { count: customerCount },
    { count: sentQuoteCount },
  ] = await Promise.all([
    admin
      .from("org_settings")
      .select("logo_url,primary_phone,default_warranty_text,payment_instructions")
      .eq("org_id", orgId)
      .maybeSingle(),
    admin
      .from("service_presets")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    admin
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    admin
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "sent"),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = orgSettings as any;

  const steps: ChecklistStep[] = [
    {
      id: "logo",
      label: "Upload your logo",
      done: !!(s?.logo_url),
      href: "/app/profile",
    },
    {
      id: "phone",
      label: "Add your business phone",
      done: !!(s?.primary_phone),
      href: "/app/profile",
    },
    {
      id: "warranty",
      label: "Write your default warranty",
      done: !!(s?.default_warranty_text?.trim()),
      href: "/app/profile",
    },
    {
      id: "payment",
      label: "Set your payment instructions",
      done: !!(s?.payment_instructions?.trim()),
      href: "/app/profile",
    },
    {
      id: "preset",
      label: "Add a service or price preset",
      done: (presetCount ?? 0) > 0,
      href: "/app/profile",
    },
    {
      id: "customer",
      label: "Add your first customer",
      done: (customerCount ?? 0) > 0,
      href: "/app/customers",
    },
    {
      id: "quote",
      label: "Send your first quote",
      done: (sentQuoteCount ?? 0) > 0,
      href: "/app/quotes/new",
    },
    {
      id: "referral",
      label: "Share TradeBase with your network",
      done: false,
      href: "/app/referral",
      storageKey: "tb_referral_shared",
    },
  ];

  return <SetupChecklistCard steps={steps} />;
}
