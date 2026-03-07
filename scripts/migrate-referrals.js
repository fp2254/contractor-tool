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

  await client.query(`
    CREATE TABLE IF NOT EXISTS referral_codes (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL,
      org_id      UUID NOT NULL,
      code        VARCHAR(16) NOT NULL UNIQUE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✓ referral_codes");

  await client.query(`
    CREATE TABLE IF NOT EXISTS referrals (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referrer_org_id   UUID NOT NULL,
      referrer_user_id  UUID NOT NULL,
      code              VARCHAR(16) NOT NULL,
      referred_email    VARCHAR(255),
      referred_user_id  UUID,
      status            VARCHAR(32) NOT NULL DEFAULT 'pending',
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✓ referrals");

  await client.query(`
    CREATE TABLE IF NOT EXISTS referral_payouts (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referrer_org_id     UUID NOT NULL,
      referrer_user_id    UUID NOT NULL,
      referred_user_id    UUID NOT NULL,
      amount              NUMERIC(10,2) NOT NULL DEFAULT 0,
      subscription_month  VARCHAR(7) NOT NULL,
      status              VARCHAR(32) NOT NULL DEFAULT 'pending',
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✓ referral_payouts");

  await client.end();
  console.log("Migration complete.");
}

main().catch(err => { console.error(err.message); process.exit(1); });
