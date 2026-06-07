import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "admin_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function makeAdminToken(password: string): string {
  return createHash("sha256")
    .update(`${password}:${process.env.ADMIN_EMAIL ?? ""}:tradebase-admin-v1`)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!body.password || body.password !== adminPassword) {
    await new Promise(r => setTimeout(r, 800));
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = makeAdminToken(adminPassword);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
