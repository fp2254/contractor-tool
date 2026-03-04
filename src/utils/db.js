import pg from "pg";
import { createClient } from "@supabase/supabase-js";

// Allow self-signed certificates for Supabase connection pooler
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = pg;

const rawDbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const isDev = !process.env.SUPABASE_DB_URL;

function sanitizeConnectionString(str) {
  if (!str) return str;
  try {
    new URL(str);
    return str;
  } catch {
    try {
      const protoEnd = str.indexOf("://");
      if (protoEnd === -1) return str;
      const proto = str.substring(0, protoEnd + 3);
      const rest = str.substring(protoEnd + 3);
      const lastAt = rest.lastIndexOf("@");
      if (lastAt === -1) return str;
      const auth = rest.substring(0, lastAt);
      const hostPart = rest.substring(lastAt + 1);
      const colonIdx = auth.indexOf(":");
      if (colonIdx === -1) return str;
      const user = auth.substring(0, colonIdx);
      const password = auth.substring(colonIdx + 1);
      const encoded = `${proto}${encodeURIComponent(user)}:${encodeURIComponent(password)}@${hostPart}`;
      new URL(encoded);
      console.log("[DB] Connection string sanitized (special chars in password)");
      return encoded;
    } catch {
      return str;
    }
  }
}

const dbUrl = sanitizeConnectionString(rawDbUrl);

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

const needsSsl = true; // Force SSL for all external DB connections

console.log(`[DB] SSL enabled: ${needsSsl}`);

export const pgPool = new Pool({
  connectionString: dbUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
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
