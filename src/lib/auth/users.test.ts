import { describe, expect, it } from "vitest";

import { firstErrors } from "@/lib/campaign/validation";
import {
  ROLE_DESCRIPTIONS,
  generateTemporaryPassword,
  newUserSchema,
} from "./users";
import { ROLES, capabilitiesFor } from "./permissions";

const valid = {
  name: "Sanne de Vries",
  email: "sanne@voxclip.it",
  role: "AUTHOR",
};

function errors(input: unknown) {
  const result = newUserSchema.safeParse(input);
  return result.success ? {} : firstErrors(result.error);
}

describe("newUserSchema", () => {
  it("accepts a colleague", () => {
    expect(newUserSchema.safeParse(valid).success).toBe(true);
  });

  it("lowercases the email, so nobody is locked out by a capital letter", () => {
    const result = newUserSchema.safeParse({ ...valid, email: "Sanne@VoxClip.IT" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("sanne@voxclip.it");
  });

  it("asks for a name a person would recognise, not an initial", () => {
    expect(errors({ ...valid, name: "S" }).name).toBeTruthy();
  });

  it("refuses something that is not an email address", () => {
    expect(errors({ ...valid, email: "sanne" }).email).toMatch(/email/i);
  });

  it("refuses a role that does not exist", () => {
    expect(errors({ ...valid, role: "SUPERUSER" }).role).toBeTruthy();
  });

  it("accepts every role the system actually has", () => {
    for (const role of ROLES) {
      expect(newUserSchema.safeParse({ ...valid, role }).success).toBe(true);
    }
  });
});

describe("role descriptions", () => {
  it("explains every role in plain language, not by listing permissions", () => {
    for (const role of ROLES) {
      const description = ROLE_DESCRIPTIONS[role];
      expect(description).toBeTruthy();
      expect(description.length).toBeGreaterThan(25);
      expect(description).not.toMatch(/campaign:/);
    }
  });

  it("says of each role something its capabilities actually support", () => {
    // A reviewer approves and does not publish. If that ever flips in the
    // matrix, this test says the description is now a lie.
    expect(capabilitiesFor("REVIEWER")).toContain("campaign:approve");
    expect(capabilitiesFor("REVIEWER")).not.toContain("campaign:publish");
    expect(ROLE_DESCRIPTIONS.REVIEWER.toLowerCase()).toContain("approve");

    expect(capabilitiesFor("VIEWER")).toEqual(["campaign:read"]);
    expect(ROLE_DESCRIPTIONS.VIEWER.toLowerCase()).toMatch(/read|look/);
  });
});

describe("generateTemporaryPassword", () => {
  it("is long enough for the hashing minimum", () => {
    expect(generateTemporaryPassword().length).toBeGreaterThanOrEqual(12);
  });

  it("is different every time", () => {
    const set = new Set(Array.from({ length: 50 }, () => generateTemporaryPassword()));
    expect(set.size).toBe(50);
  });

  it("avoids characters that are misread when typed from a screen", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateTemporaryPassword()).not.toMatch(/[0O1lI]/);
    }
  });
});
