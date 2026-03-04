import { createClient } from "@/lib/supabase/server";

async function ensureDefaultTemplates(orgId: string, userId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("message_templates")
    .select("id,channel")
    .eq("org_id", orgId)
    .eq("is_default", true);

  const hasSms = (existing ?? []).some((t) => t.channel === "sms");
  const hasEmail = (existing ?? []).some((t) => t.channel === "email");

  const inserts = [];
  if (!hasSms) {
    inserts.push({
      org_id: orgId,
      created_by: userId,
      name: "Default SMS Follow-Up",
      channel: "sms",
      body: "Hey {first_name}, just checking in on the quote I sent over. Want to get this on the schedule?",
      is_default: true,
    });
  }
  if (!hasEmail) {
    inserts.push({
      org_id: orgId,
      created_by: userId,
      name: "Default Email Follow-Up",
      channel: "email",
      subject: "Quick follow-up on your quote",
      body: "Hi {first_name}, just checking in on the quote I sent over. Happy to answer questions and get you on the schedule.",
      is_default: true,
    });
  }

  if (inserts.length > 0) {
    await supabase.from("message_templates").insert(inserts);
  }
}

export async function ensureUserOrg() {
  const supabase = await createClient();
  const { data: userResp, error: userError } = await supabase.auth.getUser();

  if (userError || !userResp.user) {
    return null;
  }

  const userId = userResp.user.id;
  const { data: member } = await supabase.from("org_members").select("org_id").eq("user_id", userId).maybeSingle();

  if (member?.org_id) {
    await ensureDefaultTemplates(member.org_id, userId);
    return member.org_id;
  }

  const { data: org, error: orgError } = await supabase
    .from("orgs")
    .insert({
      name: userResp.user.email ? `${userResp.user.email.split("@")[0]}'s Company` : "My Company",
      owner_user_id: userId,
    })
    .select("id")
    .single();

  if (orgError || !org) throw orgError;

  const { error: memberError } = await supabase
    .from("org_members")
    .insert({ org_id: org.id, user_id: userId, role: "owner" });

  if (memberError) throw memberError;

  await ensureDefaultTemplates(org.id, userId);
  return org.id;
}
