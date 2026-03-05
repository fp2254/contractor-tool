import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// One-time migration endpoint — delete after use
export async function POST(req: Request) {
  const secret = req.headers.get("x-migration-secret");
  if (secret !== "tradebase-migrate-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Use pg through Supabase's internal connection by calling a function
  // We'll run the migration by leveraging Supabase's rpc if available,
  // otherwise fall back to individual operations

  // First check if column already exists
  const { error: checkError } = await admin
    .from("quotes")
    .select("public_token")
    .limit(1);

  if (!checkError) {
    return NextResponse.json({ ok: true, message: "Migration already applied" });
  }

  // Column doesn't exist — we need to use the pg pool from the server
  const { Pool } = await import("pg");

  const raw = process.env.TB_POOL_URL || "";
  // URL-decode the password component
  const match = raw.match(/^postgresql:\/\/([^:]+):(.+)@([^:\/]+):(\d+)\/(.+)$/);
  if (!match) {
    return NextResponse.json({ error: "Could not parse connection string" }, { status: 500 });
  }

  const [, user, encodedPassword, host, port, database] = match;
  const password = decodeURIComponent(encodedPassword);

  const pool = new Pool({
    user,
    password,
    host,
    port: parseInt(port),
    database,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  try {
    const client = await pool.connect();
    await client.query(`
      ALTER TABLE public.quotes
        ADD COLUMN IF NOT EXISTS public_token UUID UNIQUE DEFAULT gen_random_uuid() NOT NULL,
        ADD COLUMN IF NOT EXISTS accepted_signature_name TEXT
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS quotes_public_token_idx ON public.quotes (public_token)
    `);
    const { rows } = await client.query(
      "SELECT COUNT(*) as n, COUNT(public_token) as wt FROM public.quotes"
    );
    client.release();
    await pool.end();
    return NextResponse.json({ ok: true, stats: rows[0] });
  } catch (err) {
    await pool.end();
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
