import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureRealtorProfile } from "@/lib/realtor";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email: string;
      password: string;
      full_name: string;
      agency_name?: string;
      phone?: string;
    };

    const { email, password, full_name, agency_name, phone } = body;

    if (!email?.trim() || !password || password.length < 8 || !full_name?.trim()) {
      return NextResponse.json(
        { error: "Name, email, and an 8+ character password are required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        account_type: "realtor",
      },
    });

    if (createError || !created?.user) {
      const message =
        createError?.message?.includes("already been registered")
          ? "An account with this email already exists."
          : createError?.message ?? "Could not create account.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const profile = await ensureRealtorProfile(created.user.id, full_name.trim());

    if (profile) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from("realtor_profiles")
        .update({
          agency_name: agency_name?.trim() || null,
          phone: phone?.trim() || null,
        })
        .eq("id", profile.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Realtor signup error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
