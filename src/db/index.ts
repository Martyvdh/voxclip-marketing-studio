import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * One connection pool per process. Next.js hot reload would otherwise open a new
 * pool on every edit until the database refuses connections.
 */
const globalForDb = globalThis as unknown as {
  __voxclipSql?: ReturnType<typeof postgres>;
};

function client() {
  if (!globalForDb.__voxclipSql) {
    globalForDb.__voxclipSql = postgres(getEnv().DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      prepare: false, // safe with connection poolers such as Neon's
    });
  }
  return globalForDb.__voxclipSql;
}

export const db = drizzle(client(), { schema });

export type Db = typeof db;
export * as tables from "./schema";
