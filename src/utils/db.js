import pg from "pg";
import { createClient } from "@supabase/supabase-js";
const { Pool } = pg;

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const isDev = !process.env.SUPABASE_DB_URL;

if (isDev) {
  console.log("[DB] Development mode: using DATABASE_URL");
} else {
  const host = dbUrl.split("@")[1]?.split("/")[0]?.split(":")[0] || "";
  console.log(`[DB] Development mode: connecting to ${host}`);
  if (process.env.NODE_ENV === "production" && !host.includes(".pooler.supabase.com")) {
    console.error("🚨 FATAL: Production must use Supabase Connection Pooler (.pooler.supabase.com)");
    process.exit(1);
  }
}

export const pgPool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl?.includes("supabase") ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pgPool.on("error", (err) => {
  console.error("[pgPool] Unexpected error on idle client", err);
});

const supabaseAdminRaw = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const guardedMethods = ["insert", "update", "upsert", "delete"];
export const supabaseAdmin = new Proxy(supabaseAdminRaw, {
  get(target, prop) {
    if (prop === "from") {
      return function (tableName) {
        const original = target.from(tableName);
        return new Proxy(original, {
          get(queryTarget, queryProp) {
            const originalMethod = queryTarget[queryProp];
            if (guardedMethods.includes(queryProp) && typeof originalMethod === "function") {
              return function (...args) {
                const stack = new Error().stack;
                console.error(`🚨 [SUPABASE GUARD] BLOCKED: supabaseAdmin.from("${tableName}").${queryProp}()`);
                throw new Error(`[SUPABASE GUARD] Use pgPool instead. Stack: ${stack}`);
              };
            }
            return typeof originalMethod === "function"
              ? originalMethod.bind(queryTarget)
              : originalMethod;
          },
        });
      };
    }
    return typeof target[prop] === "function" ? target[prop].bind(target) : target[prop];
  },
});

export { supabaseAdminRaw };
