"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { auditEvents, sessions, users, type Role } from "@/db/schema";
import type { FormState } from "@/lib/campaign/actions";
import { firstErrors } from "@/lib/campaign/validation";
import { NotAuthorisedError, requireCapability } from "./index";
import { hashPassword } from "./password";
import { generateTemporaryPassword, newUserSchema } from "./users";

export interface CreateUserState extends FormState {
  /** Shown once, to the admin who created the account. Never stored in plain text. */
  created?: { name: string; email: string; password: string };
}

export async function createUser(
  _prev: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  let admin;
  try {
    admin = await requireCapability("user:manage");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const parsed = newUserSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? ""),
  });
  if (!parsed.success) return { errors: firstErrors(parsed.error) };

  const db = getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  if (existing.length > 0) {
    return { errors: { email: "Somebody already has that email address." } };
  }

  const password = generateTemporaryPassword();
  const [created] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash: await hashPassword(password),
    })
    .returning();

  await db.insert(auditEvents).values({
    action: "USER_CREATED",
    actorId: admin.id,
    subjectType: "User",
    subjectId: created.id,
    summary: `${admin.name} added ${created.name} as ${created.role}.`,
    // The password is not in the detail. An audit trail is not a password store.
    detail: { email: created.email, role: created.role },
  });

  revalidatePath("/users");
  return {
    ok: true,
    created: { name: created.name, email: created.email, password },
  };
}

export async function setUserRole(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let admin;
  try {
    admin = await requireCapability("user:manage");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as Role;

  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return { message: "That person no longer exists." };

  // An admin cannot demote themselves. Locking yourself out of your own studio
  // is the kind of mistake that needs a database console to undo.
  if (target.id === admin.id && role !== "ADMIN") {
    return {
      message:
        "You cannot take your own admin rights away. Ask another admin to do it, so there is always someone who can let people back in.",
    };
  }

  await db.update(users).set({ role }).where(eq(users.id, id));

  await db.insert(auditEvents).values({
    action: "USER_ROLE_CHANGED",
    actorId: admin.id,
    subjectType: "User",
    subjectId: id,
    summary: `${admin.name} changed ${target.name} from ${target.role} to ${role}.`,
  });

  revalidatePath("/users");
  return { ok: true };
}

export async function setUserActive(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let admin;
  try {
    admin = await requireCapability("user:manage");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";

  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return { message: "That person no longer exists." };

  if (target.id === admin.id && !active) {
    return { message: "You cannot deactivate your own account." };
  }

  await db.update(users).set({ isActive: active }).where(eq(users.id, id));

  // Deactivating ends their sessions immediately. Leaving them signed in until
  // the cookie expires would make the button a suggestion rather than a switch.
  if (!active) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.userId, id));
  }

  await db.insert(auditEvents).values({
    action: active ? "USER_ROLE_CHANGED" : "USER_DEACTIVATED",
    actorId: admin.id,
    subjectType: "User",
    subjectId: id,
    summary: active
      ? `${admin.name} reactivated ${target.name}.`
      : `${admin.name} deactivated ${target.name} and signed them out.`,
  });

  revalidatePath("/users");
  return { ok: true };
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
}

export async function listTeam(): Promise<TeamMember[]> {
  const rows = await getDb()
    .select()
    .from(users)
    .orderBy(users.createdAt);

  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  }));
}
