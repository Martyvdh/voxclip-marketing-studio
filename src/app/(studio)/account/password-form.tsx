"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/brand-client";
import { SubmitButton } from "@/components/form";
import { changePassword } from "@/lib/auth/actions";
import type { FormState } from "@/lib/campaign/actions";

function PasswordField({
  id,
  label,
  hint,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  autoComplete: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changePassword, {});

  return (
    <form action={action} className="mt-6 max-w-sm space-y-4">
      {state.ok ? (
        <FormMessage
          tone="ok"
          message="Password changed. Every other session has been signed out."
        />
      ) : null}
      <FormMessage message={state.message} />

      <PasswordField
        id="currentPassword"
        label="Current password"
        autoComplete="current-password"
        error={state.errors?.currentPassword}
      />

      <PasswordField
        id="newPassword"
        label="New password"
        autoComplete="new-password"
        hint="At least 12 characters. A short sentence you will remember beats a clever short one."
        error={state.errors?.newPassword}
      />

      <PasswordField
        id="confirmPassword"
        label="New password again"
        autoComplete="new-password"
        error={state.errors?.confirmPassword}
      />

      <SubmitButton pendingLabel="Changing">Change password</SubmitButton>
    </form>
  );
}
