/**
 * The server-side entry point for identity.
 *
 * Every protected page and every mutation calls requireUser or
 * requireCapability. There is no client-side check that stands in for this.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  SESSION_COOKIE,
  validateSessionToken,
  type AuthenticatedUser,
} from "./session";
import { can, describeDenial, type Capability } from "./permissions";

export * from "./permissions";
export * from "./session";

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const store = await cookies();
  return validateSessionToken(store.get(SESSION_COOKIE)?.value);
}

/** Redirects to the sign-in page when there is no valid session. */
export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export class NotAuthorisedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotAuthorisedError";
  }
}

/**
 * Use in a server action or route handler. Throws rather than redirects, so the
 * caller can show the reason in place instead of losing the operator's work.
 */
export async function requireCapability(
  capability: Capability,
): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (!can(user.role, capability)) {
    throw new NotAuthorisedError(describeDenial(user.role, capability));
  }
  return user;
}
