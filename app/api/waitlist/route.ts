import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
      trade?: string;
      company?: string;
      state?: string;
      pain_point?: string;
      source?: string;
    };

    if (!body.first_name?.trim() || !body.last_name?.trim() || !body.email?.trim()) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    const admin = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from("waitlist")
      .insert({
        first_name: body.first_name.trim(),
        last_name: body.last_name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone?.trim() ?? null,
        trade: body.trade?.trim() ?? null,
        company: body.company?.trim() ?? null,
        state: body.state?.trim() ?? null,
        pain_point: body.pain_point?.trim() ?? null,
        source: body.source?.trim() ?? null,
      });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "That email is already on the waitlist." }, { status: 409 });
      }
      console.error("Waitlist insert error:", error);
      return NextResponse.json({ error: "Failed to save your spot. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Waitlist route error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
