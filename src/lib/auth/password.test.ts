import { describe, expect, it } from "vitest";

import { hashPassword, needsRehash, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("een lang genoeg wachtwoord");
    expect(await verifyPassword("een lang genoeg wachtwoord", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("een lang genoeg wachtwoord");
    expect(await verifyPassword("een ander wachtwoord", hash)).toBe(false);
  });

  it("never stores the password itself", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct");
    expect(hash).not.toContain("staple");
  });

  it("produces a different hash every time, so equal passwords are not visible", async () => {
    const a = await hashPassword("same password twice");
    const b = await hashPassword("same password twice");
    expect(a).not.toEqual(b);
    expect(await verifyPassword("same password twice", a)).toBe(true);
    expect(await verifyPassword("same password twice", b)).toBe(true);
  });

  it("records its parameters so they can be raised later", async () => {
    const hash = await hashPassword("some password here");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash.split("$")).toHaveLength(6);
  });

  it("refuses a password that is too short to be worth hashing", async () => {
    await expect(hashPassword("short")).rejects.toThrow(/12 characters/);
  });

  it("returns false rather than throwing on a malformed stored hash", async () => {
    expect(await verifyPassword("anything at all", "not-a-hash")).toBe(false);
    expect(await verifyPassword("anything at all", "")).toBe(false);
  });

  it("flags a hash made with weaker parameters for rehashing", async () => {
    const current = await hashPassword("a perfectly fine password");
    expect(needsRehash(current)).toBe(false);
    expect(needsRehash("scrypt$1024$8$1$abcd$efgh")).toBe(true);
  });
});
