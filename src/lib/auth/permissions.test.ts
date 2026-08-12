import { describe, expect, it } from "vitest";

import type { Role } from "@/db/schema";
import {
  ALL_CAPABILITIES,
  ROLES,
  can,
  capabilitiesFor,
  describeDenial,
} from "./permissions";

describe("the capability matrix", () => {
  it("gives every role an explicit capability list", () => {
    for (const role of ROLES) {
      expect(capabilitiesFor(role)).toBeDefined();
    }
  });

  it("never grants a capability that does not exist", () => {
    for (const role of ROLES) {
      for (const capability of capabilitiesFor(role)) {
        expect(ALL_CAPABILITIES).toContain(capability);
      }
    }
  });

  it("lets an admin do everything", () => {
    for (const capability of ALL_CAPABILITIES) {
      expect(can("ADMIN", capability)).toBe(true);
    }
  });

  it("lets a viewer only read", () => {
    expect(capabilitiesFor("VIEWER")).toEqual(["campaign:read"]);
  });
});

describe("least privilege", () => {
  const cases: [Role, string, boolean][] = [
    ["AUTHOR", "campaign:create", true],
    ["AUTHOR", "campaign:edit", true],
    ["AUTHOR", "campaign:approve", false],
    ["AUTHOR", "campaign:publish", false],
    ["AUTHOR", "connection:manage", false],
    ["AUTHOR", "user:manage", false],
    ["REVIEWER", "campaign:approve", true],
    ["REVIEWER", "campaign:publish", false],
    ["REVIEWER", "connection:manage", false],
    ["PUBLISHER", "campaign:schedule", true],
    ["PUBLISHER", "campaign:publish", true],
    ["PUBLISHER", "campaign:approve", false],
    ["PUBLISHER", "user:manage", false],
    ["VIEWER", "campaign:create", false],
    ["VIEWER", "campaign:read", true],
  ];

  for (const [role, capability, expected] of cases) {
    it(`${role} ${expected ? "can" : "cannot"} ${capability}`, () => {
      expect(can(role, capability as (typeof ALL_CAPABILITIES)[number])).toBe(
        expected,
      );
    });
  }

  it("keeps approving and publishing apart from writing", () => {
    expect(can("AUTHOR", "campaign:approve")).toBe(false);
    expect(can("AUTHOR", "campaign:publish")).toBe(false);
  });

  it("lets nobody but an admin read or manage provider secrets", () => {
    for (const role of ROLES) {
      if (role === "ADMIN") continue;
      expect(can(role, "connection:manage")).toBe(false);
    }
  });
});

describe("denial messages", () => {
  it("says what was needed and what the person has", () => {
    const message = describeDenial("AUTHOR", "campaign:publish");
    expect(message).toContain("publish");
    expect(message).toContain("AUTHOR");
  });
});
