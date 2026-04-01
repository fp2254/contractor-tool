import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect("https://tradebase.contractors/auth/login");
}
