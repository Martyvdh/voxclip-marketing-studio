"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
import { cookies } from "next/headers";

import { getDb } from "@/db";
import { auditEvents, sessions, users } from "@/db/schema";
import type { FormState } from "@/lib/campaign/actions";
import { firstErrors } from "@/lib/campaign/validation";
import { requireUser } from "./index";
import { changePasswordSchema } from "./change-password";
import { hashPassword, verifyPassword } from "./password";
import { SESSION_COOKIE, hashToken } from "./session";

export async function changePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) return { errors: firstErrors(parsed.error) };

  const db = getDb();
  const [row] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!row || !(await verifyPassword(parsed.data.currentPassword, row.passwordHash))) {
    await db.insert(auditEvents).values({
      action: "LOGIN_FAILED",
      actorId: user.id,
      subjectType: "User",
      subjectId: user.id,
      summary: "A password change was attempted with the wrong current password.",
    });
    return { errors: { currentPassword: "That is not your current password." } };
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword) })
    .where(eq(users.id, user.id));

  // Every other session ends. If the old password was seen by someone, whatever
  // they were signed in on stops working now. This one stays, so the person
  // changing it is not thrown out mid-task.
  const store = await cookies();
  const currentToken = store.get(SESSION_COOKIE)?.value;
  const keepHash = currentToken ? hashToken(currentToken) : "";

  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(sessions.userId, user.id),
        isNull(sessions.revokedAt),
        ne(sessions.tokenHash, keepHash),
      ),
    );

  await db.insert(auditEvents).values({
    action: "SESSION_REVOKED",
    actorId: user.id,
    subjectType: "User",
    subjectId: user.id,
    summary: `${user.name} changed their password. All other sessions were signed out.`,
  });

  return { ok: true };
}
