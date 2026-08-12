"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import { auditEvents, users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  createSession,
  hashIp,
  revokeSession,
  sessionCookieOptions,
} from "@/lib/auth/session";

const credentials = z.object({
  email: z.string().email("That does not look like an email address."),
  password: z.string().min(1, "Enter your password."),
});

export interface SignInState {
  error?: string;
}

/** Ten failures from one address in fifteen minutes is enough. */
const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = credentials.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const db = getDb();
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ipHash = hashIp(ip);

  if (ipHash) {
    const since = new Date(Date.now() - WINDOW_MS);
    const [recent] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.action, "LOGIN_FAILED"),
          eq(auditEvents.subjectId, ipHash),
          gte(auditEvents.createdAt, since),
        ),
      );
    if ((recent?.count ?? 0) >= MAX_FAILURES) {
      return {
        error:
          "Too many failed attempts from this connection. Wait fifteen minutes and try again.",
      };
    }
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  const ok =
    user && user.isActive
      ? await verifyPassword(parsed.data.password, user.passwordHash)
      : false;

  if (!ok || !user) {
    await db.insert(auditEvents).values({
      action: "LOGIN_FAILED",
      subjectType: "Login",
      subjectId: ipHash,
      // No email in the summary. A failed login should not confirm who exists.
      summary: "A sign-in attempt failed.",
    });
    // The same message either way, so this cannot be used to discover accounts.
    return { error: "That email and password do not match." };
  }

  const { token } = await createSession(user.id, {
    ip,
    userAgent: headerList.get("user-agent"),
  });

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  await db.insert(auditEvents).values({
    action: "LOGIN_SUCCEEDED",
    actorId: user.id,
    subjectType: "User",
    subjectId: user.id,
    summary: `${user.name} signed in.`,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());

  redirect("/");
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  await revokeSession(token);
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
