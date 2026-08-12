/**
 * Sessions.
 *
 * The raw token exists in exactly two places: the user's cookie and the browser
 * request. The database only ever holds its SHA-256, so a database leak does
 * not hand anyone a working session.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { auditEvents, sessions, users } from "@/db/schema";
import { getEnv } from "@/lib/env";

export const SESSION_COOKIE = "voxclip_studio_session";

/** Twelve hours. Short enough that a forgotten laptop is not a standing risk. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Hashed with the app secret so an audit trail never stores a raw address. */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256")
    .update(`${ip}:${getEnv().SESSION_SECRET}`)
    .digest("hex")
    .slice(0, 32);
}

export function sessionCookieOptions() {
  const isHttps = getEnv().APP_URL.startsWith("https://");
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isHttps,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

export interface SessionMeta {
  ip?: string | null;
  userAgent?: string | null;
}

export async function createSession(
  userId: string,
  meta: SessionMeta = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await getDb()
    .insert(sessions)
    .values({
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      ipHash: hashIp(meta.ip ?? null),
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
    });

  return { token, expiresAt };
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: (typeof users.$inferSelect)["role"];
}

export async function validateSessionToken(
  token: string | undefined | null,
): Promise<AuthenticatedUser | null> {
  if (!token) return null;

  const db = getDb();
  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      revokedAt: sessions.revokedAt,
      userId: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), isNull(sessions.revokedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  if (!row.isActive) return null;

  await db
    .update(sessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(sessions.id, row.sessionId));

  return {
    id: row.userId,
    email: row.email,
    name: row.name,
    role: row.role,
  };
}

export async function revokeSession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  const db = getDb();
  const hash = hashToken(token);

  const found = await db
    .select({ id: sessions.id, userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.tokenHash, hash))
    .limit(1);

  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, hash));

  if (found[0]) {
    await db.insert(auditEvents).values({
      action: "LOGOUT",
      actorId: found[0].userId,
      subjectType: "Session",
      subjectId: found[0].id,
      summary: "Signed out.",
    });
  }
}

/**
 * Constant-time string compare, for anything that is not a password hash.
 * Returns false on a length mismatch without leaking where it differed.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
