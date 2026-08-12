"use client";

/**
 * The few brand pieces a client component needs. Kept separate from
 * components/brand.tsx so server components are not dragged across the boundary.
 */

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-5 ${className}`}>
      {children}
    </div>
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
