/**
 * Password hashing with Node's built-in scrypt.
 *
 * No native module to compile and nothing extra to keep patched. See
 * docs/decisions.md D-005 for the trade against argon2id.
 *
 * Stored format: scrypt$N$r$p$saltBase64$hashBase64
 * The parameters travel with the hash, so they can be raised without
 * invalidating anyone's password.
 */

import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import { promisify } from "node:util";

/**
 * promisify loses the options overload, so the signature is restated here.
 * Without it the cost parameters could be dropped silently.
 */
const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

/** Current parameters. Raise N first when hardware gets faster. */
const PARAMS = { N: 16384, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MIN_LENGTH = 12;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < MIN_LENGTH) {
    throw new Error(
      `A password needs at least ${MIN_LENGTH} characters. A short one is not worth hashing.`,
    );
  }

  const salt = randomBytes(SALT_LENGTH);
  const derived = (await scrypt(password, salt, KEY_LENGTH, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
    maxmem: 128 * PARAMS.N * PARAMS.r * 2,
  })) as Buffer;

  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  let expected: Buffer;
  try {
    expected = Buffer.from(hashB64, "base64");
  } catch {
    return false;
  }
  if (expected.length === 0) return false;

  try {
    const derived = (await scrypt(
      password,
      Buffer.from(saltB64, "base64"),
      expected.length,
      { N, r, p, maxmem: 128 * N * r * 2 },
    ));
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** True when a stored hash used weaker parameters than we use now. */
export function needsRehash(stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return true;
  const [, N, r, p] = parts;
  return (
    Number(N) < PARAMS.N || Number(r) < PARAMS.r || Number(p) < PARAMS.p
  );
}
