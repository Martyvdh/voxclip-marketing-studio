/**
 * Who may do what.
 *
 * This replaces the shared team code. Every protected read and mutation asks
 * this module, on the server, before it does anything.
 *
 * Two separations matter and are deliberate:
 *  - writing is separate from approving, so nobody approves their own work;
 *  - approving is separate from publishing, so an approval is not a green light
 *    to post by itself.
 */

import type { Role } from "@/db/schema";

export const ROLES: Role[] = [
  "ADMIN",
  "PUBLISHER",
  "REVIEWER",
  "AUTHOR",
  "VIEWER",
];

export const ALL_CAPABILITIES = [
  "campaign:read",
  "campaign:create",
  "campaign:edit",
  "campaign:review", // leave comments, request changes
  "campaign:approve", // bind an approval to an exact version
  "campaign:schedule",
  "campaign:publish",
  "asset:upload",
  "research:capture",
  "research:approve",
  "truth:verify", // mark a product fact verified
  "connection:manage", // add, revoke, and hold provider tokens
  "user:manage",
  "audit:read",
] as const;

export type Capability = (typeof ALL_CAPABILITIES)[number];

const MATRIX: Record<Role, Capability[]> = {
  ADMIN: [...ALL_CAPABILITIES],
  PUBLISHER: [
    "campaign:read",
    "campaign:create",
    "campaign:edit",
    "campaign:review",
    "campaign:schedule",
    "campaign:publish",
    "asset:upload",
    "research:capture",
    "audit:read",
  ],
  REVIEWER: [
    "campaign:read",
    "campaign:review",
    "campaign:approve",
    "research:capture",
    "research:approve",
    "truth:verify",
    "audit:read",
  ],
  AUTHOR: [
    "campaign:read",
    "campaign:create",
    "campaign:edit",
    "asset:upload",
    "research:capture",
  ],
  VIEWER: ["campaign:read"],
};

export function capabilitiesFor(role: Role): Capability[] {
  return MATRIX[role];
}

export function can(role: Role, capability: Capability): boolean {
  return MATRIX[role].includes(capability);
}

/** Plain language for the operator. Says what was needed, not just "forbidden". */
export function describeDenial(role: Role, capability: Capability): string {
  return `This action needs the ${capability} permission and your role is ${role}. Ask an admin if you should have it.`;
}
