import { randomInt } from "node:crypto";
import { z } from "zod";

import { roleEnum, type Role } from "@/db/schema";

export const newUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Use the name your colleague would recognise on an approval."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("That does not look like an email address."),
  role: z.enum(roleEnum.enumValues, {
    message: "Pick what this person is allowed to do.",
  }),
});

export type NewUserInput = z.infer<typeof newUserSchema>;

/**
 * What each role means, in the words of the person choosing it. Deliberately
 * not a list of permission strings: nobody picks a role by reading those.
 */
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN:
    "Everything, including adding people and holding the keys to connected accounts. Give this to as few people as the work allows.",
  PUBLISHER:
    "Writes, schedules, and publishes. Cannot approve, so somebody else still has to read it first.",
  REVIEWER:
    "Reads and decides. Can approve a version or ask for changes, and can verify product facts. Cannot publish.",
  AUTHOR:
    "Writes campaigns, drafts variants, and uploads assets. Cannot approve their own work and cannot publish.",
  VIEWER: "Can read what is going on and nothing more. Good for someone new.",
};

/**
 * A first password, shown once to the admin who created the account.
 *
 * Characters that are misread off a screen are left out: no zero and capital O,
 * no one, lowercase L, or capital i. Whoever types this in is reading it aloud
 * or copying it from a message, and a password that cannot be typed is a
 * password that gets replaced by something worse.
 */
export function generateTemporaryPassword(): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const groups = 4;
  const perGroup = 4;

  return Array.from({ length: groups }, () =>
    Array.from(
      { length: perGroup },
      () => alphabet[randomInt(alphabet.length)],
    ).join(""),
  ).join("-");
}
