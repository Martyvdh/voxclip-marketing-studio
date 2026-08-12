import { z } from "zod";

/**
 * Changing a password.
 *
 * The current password is required even though the session already proves who
 * this is. A session can be borrowed from an unlocked laptop; knowing the old
 * password is what stops that becoming a lockout.
 *
 * Nothing here is trimmed. A leading or trailing space is a character the
 * person chose, and silently removing it means the password they typed is not
 * the password we stored.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(12, "A password needs at least 12 characters. Longer beats clever."),
    confirmPassword: z.string().min(1, "Type the new password once more."),
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "The new password has to be different from the current one.",
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two new passwords do not match.",
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
