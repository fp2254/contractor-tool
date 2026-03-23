import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const url = new URL("https://tradebase.contractors/waitlist");
  if (code) url.searchParams.set("ref", code.toUpperCase());
  return NextResponse.redirect(url.toString());
}
