import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, inviteEmailHtml } from "@/lib/email";

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

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { first_name, last_name, biz_name, trade, phone },
      redirectTo: "https://tradebase.contractors/auth/confirm",
    },
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("[invite] generateLink error:", linkError?.message);
    return NextResponse.json({ error: linkError?.message ?? "Could not generate invite link" }, { status: 400 });
  }

  const hashedToken = linkData.properties.hashed_token;
  const inviteUrl = `https://tradebase.contractors/auth/confirm?token_hash=${hashedToken}&type=invite`;

  try {
    const { client: resend, fromEmail } = await getResendClient();
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `You're invited to TradeBase`,
      html: inviteEmailHtml({ firstName: first_name, inviteUrl }),
    });
  } catch (emailErr) {
    console.error("[invite] Resend error:", emailErr);
    return NextResponse.json({ error: "Could not send invite email" }, { status: 500 });
  }

  await (admin as any)
    .from("waitlist")
    .update({ source: "invited" })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
