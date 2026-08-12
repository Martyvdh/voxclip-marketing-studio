import { describe, expect, it } from "vitest";

import { firstErrors } from "@/lib/campaign/validation";
import { changePasswordSchema } from "./change-password";

const valid = {
  currentPassword: "the-one-the-seed-printed",
  newPassword: "a new password that is long",
  confirmPassword: "a new password that is long",
};

function errors(input: unknown) {
  const result = changePasswordSchema.safeParse(input);
  return result.success ? {} : firstErrors(result.error);
}

describe("changePasswordSchema", () => {
  it("accepts a sound change", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("asks for the current password, so a borrowed session cannot lock someone out", () => {
    expect(errors({ ...valid, currentPassword: "" }).currentPassword).toBeTruthy();
  });

  it("refuses a new password shorter than the hashing minimum", () => {
    const message = errors({
      ...valid,
      newPassword: "short",
      confirmPassword: "short",
    }).newPassword;
    expect(message).toMatch(/12/);
  });

  it("refuses a new password equal to the current one", () => {
    const message = errors({
      currentPassword: "the same long password",
      newPassword: "the same long password",
      confirmPassword: "the same long password",
    }).newPassword;
    expect(message).toMatch(/different/i);
  });

  it("catches a typo in the confirmation and says so on that field", () => {
    const message = errors({
      ...valid,
      confirmPassword: "a new password that is lomg",
    }).confirmPassword;
    expect(message).toMatch(/match/i);
  });

  it("does not trim the password, because a space is a character", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "current one here",
      newPassword: " leading space kept ",
      confirmPassword: " leading space kept ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.newPassword).toBe(" leading space kept ");
    }
  });
});
