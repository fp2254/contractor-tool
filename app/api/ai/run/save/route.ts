import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrg } from "@/lib/auth";

export async function POST(req: Request) {
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await req.json() as {
    feature: string;
    input_text?: string;
    input_json?: Record<string, unknown>;
    output_json?: Record<string, unknown>;
    output_text?: string;
  };

  if (!body.feature) {
    return NextResponse.json({ error: "feature required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("ai_runs" as "orgs")
    .insert({
      org_id: orgId!,
      user_id: user?.id ?? null,
      feature: body.feature,
      input_text: body.input_text ?? null,
      input_json: body.input_json ?? null,
      output_json: body.output_json ?? null,
      output_text: body.output_text ?? null,
    } as never)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: (data as { id: string }).id });
}
