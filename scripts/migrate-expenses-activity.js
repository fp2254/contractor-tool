#!/usr/bin/env node
const { Client } = require("pg");

function parseConnStr(connStr) {
  const withoutProto = connStr.replace(/^postgresql:\/\//, "").replace(/^postgres:\/\//, "");
  const lastAt = withoutProto.lastIndexOf("@");
  const userPass = withoutProto.substring(0, lastAt);
  const hostDbPart = withoutProto.substring(lastAt + 1);
  const firstColon = userPass.indexOf(":");
  const user = userPass.substring(0, firstColon);
  const password = userPass.substring(firstColon + 1);
  const slashIdx = hostDbPart.indexOf("/");
  const hostPort = slashIdx >= 0 ? hostDbPart.substring(0, slashIdx) : hostDbPart;
  const database = slashIdx >= 0 ? hostDbPart.substring(slashIdx + 1).split("?")[0] : "postgres";
  const colonIdx = hostPort.lastIndexOf(":");
  const host = colonIdx >= 0 ? hostPort.substring(0, colonIdx) : hostPort;
  const port = colonIdx >= 0 ? parseInt(hostPort.substring(colonIdx + 1)) : 5432;
  return { host, port, user, password, database, ssl: { rejectUnauthorized: false } };
}

async function main() {
  const raw = process.env.SUPABASE_DB_URL;
  if (!raw) throw new Error("SUPABASE_DB_URL not set");
  const config = parseConnStr(raw);
  const client = new Client(config);
  await client.connect();
  console.log("Connected to Supabase DB");

  // 1. Add category column to expenses if missing
  await client.query(`
    ALTER TABLE public.expenses
    ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other'
      CHECK (category IN ('materials','labor','fuel','tools','permits','subcontractor','equipment','other'));
  `);
  console.log("✓ expenses.category column");

  // 2. Add description column to expenses if missing
  await client.query(`
    ALTER TABLE public.expenses
    ADD COLUMN IF NOT EXISTS description TEXT;
  `);
  console.log("✓ expenses.description column");

  // 3. Create activity_log table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.activity_log (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id        UUID NOT NULL,
      user_id       UUID,
      entity_type   TEXT NOT NULL,
      entity_id     TEXT NOT NULL,
      action        TEXT NOT NULL,
      description   TEXT,
      metadata_json JSONB,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✓ activity_log table");

  // 4. RLS for activity_log
  await client.query(`ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;`);
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'org_members_rw_activity_log'
      ) THEN
        CREATE POLICY "org_members_rw_activity_log" ON public.activity_log
          FOR ALL USING (
            org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
          );
      END IF;
    END $$;
  `);
  console.log("✓ activity_log RLS");

  // 5. Indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS activity_log_org_idx ON public.activity_log (org_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS activity_log_entity_idx ON public.activity_log (entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS activity_log_user_idx ON public.activity_log (user_id);
    CREATE INDEX IF NOT EXISTS expenses_category_idx ON public.expenses (org_id, category);
  `);
  console.log("✓ indexes");

  await client.end();
  console.log("\nAll migrations applied ✓");
}

main().catch(err => { console.error(err); process.exit(1); });
