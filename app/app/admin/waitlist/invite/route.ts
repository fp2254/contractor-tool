import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const body = await req.json() as {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    biz_name: string;
    trade: string;
    phone: string;
  };

  const { id, email, first_name, last_name, biz_name, trade, phone } = body;

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      first_name,
      last_name,
      biz_name,
      trade,
      phone,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Mark as invited in the source field
  await (admin as any)
    .from("waitlist")
    .update({ source: "signup-invited" })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
