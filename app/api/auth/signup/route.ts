import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      email: string;
      password: string;
      first_name: string;
      last_name?: string;
      biz_name: string;
      trade?: string;
      phone?: string;
      ref_code?: string;
    };

    const { email, password, first_name, last_name, biz_name, trade, phone, ref_code } = body;

    if (!email?.trim() || !password || !first_name?.trim() || !biz_name?.trim()) {
      return NextResponse.json({ error: "Required fields missing." }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          first_name: first_name.trim(),
          last_name: last_name?.trim() ?? "",
          biz_name: biz_name.trim(),
          trade: trade?.trim() ?? "",
          phone: phone?.trim() ?? "",
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
    }

    if (ref_code?.trim()) {
      try {
        const admin = createAdminClient();
        const { data: codeRow } = await (admin as any)
          .from("referral_codes")
          .select("user_id")
          .eq("code", ref_code.trim().toUpperCase())
          .maybeSingle();

        if (codeRow?.user_id && codeRow.user_id !== data.user.id) {
          await (admin as any).from("referrals").insert({
            referrer_user_id: codeRow.user_id,
            referred_user_id: data.user.id,
            referred_email: email.trim().toLowerCase(),
            status: "pending",
          });
        }
      } catch {
        // Referral recording is non-fatal
      }
    }

    const needsConfirmation = !data.session;
    return NextResponse.json({ ok: true, needsConfirmation });
  } catch (err) {
    console.error("Signup route error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
