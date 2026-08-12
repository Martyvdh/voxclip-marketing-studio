import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * One connection pool per process, created on first use.
 *
 * Lazy on purpose: importing this module must not require a database, or a
 * production build would need live credentials just to compile.
 */
const globalForDb = globalThis as unknown as {
  __voxclipSql?: ReturnType<typeof postgres>;
  __voxclipDb?: ReturnType<typeof drizzle<typeof schema>>;
};

export function getDb() {
  if (!globalForDb.__voxclipDb) {
    globalForDb.__voxclipSql ??= postgres(getEnv().DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      prepare: false, // safe behind a connection pooler such as Neon's
    });
    globalForDb.__voxclipDb = drizzle(globalForDb.__voxclipSql, { schema });
  }
  return globalForDb.__voxclipDb;
}

export type Db = ReturnType<typeof getDb>;
export * from "./schema";
