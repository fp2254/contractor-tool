import { NextResponse } from "next/server";
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

    const { email, first_name, last_name, biz_name, trade, phone, ref_code } = body;

    if (!email?.trim() || !first_name?.trim() || !biz_name?.trim()) {
      return NextResponse.json({ error: "Required fields missing." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check for duplicate email
    const { data: existing } = await (admin as any)
      .from("waitlist")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true });
    }

    const source = ref_code?.trim()
      ? `signup|ref:${ref_code.trim().toUpperCase()}`
      : "signup";

    const { error } = await (admin as any).from("waitlist").insert({
      first_name: first_name.trim(),
      last_name: last_name?.trim() ?? "",
      email: email.trim().toLowerCase(),
      phone: phone?.trim() ?? null,
      trade_type: trade?.trim() ?? null,
      company_name: biz_name.trim(),
      source,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Signup route error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
