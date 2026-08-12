"use client";

import { useFormStatus } from "react-dom";

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink";

function Describe({
  id,
  hint,
  error,
}: {
  id: string;
  hint?: string;
  error?: string;
}) {
  // The error replaces the hint rather than stacking under it. Two lines saying
  // nearly the same thing reads like a bug and makes the real problem harder to
  // find.
  if (error) {
    return (
      <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-alert">
        {error}
      </p>
    );
  }

  if (hint) {
    return (
      <p id={`${id}-hint`} className="mt-1 text-xs text-ink-muted">
        {hint}
      </p>
    );
  }

  return null;
}

function describedBy(id: string, hint?: string, error?: string) {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

export function Field({
  id,
  label,
  hint,
  error,
  defaultValue,
  required,
  placeholder,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={id}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={inputClass}
      />
      <Describe id={id} hint={hint} error={error} />
    </div>
  );
}

export function TextArea({
  id,
  label,
  hint,
  error,
  defaultValue,
  rows = 3,
  placeholder,
  example,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
  /** A filled-in example. Shows what good looks like, which a hint cannot. */
  example?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={inputClass}
      />
      <Describe id={id} hint={hint} error={error} />
      {example ? (
        <p className="mt-1 text-xs text-ink-faint">
          For example: <span className="italic">{example}</span>
        </p>
      ) : null}
    </div>
  );
}

export function Select({
  id,
  label,
  hint,
  error,
  options,
  defaultValue,
  placeholder,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        name={id}
        defaultValue={defaultValue ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={inputClass}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Describe id={id} hint={hint} error={error} />
    </div>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "quiet";
}) {
  const { pending } = useFormStatus();
  const base =
    "rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed";
  const style =
    variant === "primary"
      ? "bg-ink text-white"
      : "border border-line bg-surface text-ink";

  return (
    <button type="submit" disabled={pending} className={`${base} ${style}`}>
      {pending ? (pendingLabel ?? "Working") : children}
    </button>
  );
}

export function FormMessage({
  message,
  tone = "error",
}: {
  message?: string;
  tone?: "error" | "ok";
}) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={`rounded-lg px-3 py-2 text-sm ${
        tone === "ok" ? "bg-teal-wash text-teal-deep" : "bg-alert-wash text-alert"
      }`}
    >
      {message}
    </p>
  );
}
