/**
 * Apply phone system migrations to Supabase.
 *
 * Prerequisites:
 *   1. Set SUPABASE_DB_URL in your environment:
 *      export SUPABASE_DB_URL="postgresql://postgres:[password]@db.lrtrbocvcqgfnklknlnu.supabase.co:5432/postgres"
 *   2. Run: node scripts/run-phone-migrations.cjs
 *
 * Alternatively, copy the SQL from the migration files below into Supabase Studio SQL Editor:
 *   https://supabase.com/dashboard/project/lrtrbocvcqgfnklknlnu/sql
 *
 * Migrations applied by this script (in order):
 *   1. migration_addons.sql       — creates org_addons table
 *   2. migration_addons_v2.sql    — adds external_subscription_id + billing_provider columns
 *   3. migration_phone_system.sql — creates org_phone_numbers, org_phone_settings, call_logs, call_transcripts
 */

const fs = require("fs");
const path = require("path");

async function main() {
  const connStr = process.env.SUPABASE_DB_URL;
  if (!connStr || connStr.includes("[YOUR-PASSWORD]") || connStr.includes("[password]")) {
    console.error("ERROR: Set SUPABASE_DB_URL to your actual Supabase DB connection string.");
    console.error("  export SUPABASE_DB_URL=\"postgresql://postgres:<password>@db.lrtrbocvcqgfnklknlnu.supabase.co:5432/postgres\"");
    console.error("\nAlternatively, run the SQL manually in Supabase Studio:");
    console.error("  https://supabase.com/dashboard/project/lrtrbocvcqgfnklknlnu/sql");
    process.exit(1);
  }

  let pg;
  try {
    pg = require("pg");
  } catch {
    console.error("ERROR: pg package not found. Run: pnpm add pg");
    process.exit(1);
  }

  const { Client } = pg;
  const root = path.join(__dirname, "..");

  const migrations = [
    { label: "migration_addons.sql", file: path.join(root, "supabase/migration_addons.sql") },
    { label: "migration_addons_v2.sql", file: path.join(root, "supabase/migration_addons_v2.sql") },
    { label: "migration_phone_system.sql", file: path.join(root, "supabase/migration_phone_system.sql") },
  ];

  // Parse connection string, handling special characters in password
  let clientConfig;
  try {
    const url = new URL(connStr);
    clientConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.replace(/^\//, ""),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl: { rejectUnauthorized: false },
    };
  } catch {
    // URL parsing failed (e.g. special chars in password) — try connecting directly
    clientConfig = { connectionString: connStr, ssl: { rejectUnauthorized: false } };
  }

  const client = new Client(clientConfig);
  await client.connect();
  console.log("Connected to Supabase.");

  for (const { label, file } of migrations) {
    const sql = fs.readFileSync(file, "utf-8");
    try {
      await client.query(sql);
      console.log(`✓ ${label} applied`);
    } catch (err) {
      if (err.message.includes("already exists")) {
        console.log(`✓ ${label} already applied (skipped)`);
      } else {
        console.error(`✗ ${label} failed:`, err.message);
      }
    }
  }

  // Verify tables
  const tables = ["org_addons", "org_phone_numbers", "org_phone_settings", "call_logs", "call_transcripts"];
  console.log("\nVerification — tables:");
  for (const t of tables) {
    const { rows } = await client.query(
      "SELECT EXISTS(SELECT FROM pg_tables WHERE schemaname='public' AND tablename=$1)",
      [t]
    );
    console.log(`  ${rows[0].exists ? "✓" : "✗"} ${t}`);
  }

  // Verify v2 columns on org_addons
  console.log("\nVerification — org_addons v2 columns:");
  const cols = ["external_subscription_id", "billing_provider"];
  for (const col of cols) {
    const { rows } = await client.query(
      "SELECT EXISTS(SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='org_addons' AND column_name=$1)",
      [col]
    );
    console.log(`  ${rows[0].exists ? "✓" : "✗"} org_addons.${col}`);
  }

  await client.end();
  console.log("\nDone. Reload /app/setup to confirm status.");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
