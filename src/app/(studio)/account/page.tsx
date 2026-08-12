import { Card } from "@/components/brand";
import { capabilitiesFor, requireUser } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <>
      <h1 className="text-3xl font-bold">Account</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Your own account, not a shared code. Every approval and every publication
        is recorded against the person who made it.
      </p>

      <Card className="mt-8">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Email</dt>
            <dd className="font-[family-name:var(--font-mono)] text-xs">
              {user.email}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Role</dt>
            <dd>{user.role}</dd>
          </div>
        </dl>

        <div className="mt-4 border-t border-line pt-3">
          <p className="text-xs font-medium text-ink-muted">What you may do</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {capabilitiesFor(user.role).map((c) => (
              <li
                key={c}
                className="rounded-full border border-line bg-paper px-2 py-0.5 font-[family-name:var(--font-mono)] text-[11px] text-ink-muted"
              >
                {c}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <section className="mt-10" aria-labelledby="password-heading">
        <h2 id="password-heading" className="text-lg font-semibold">
          Change your password
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          The seed printed your first password once, to a terminal. Change it to
          something only you know. Changing it signs out every other session,
          which is what makes it worth doing if that password was ever seen.
        </p>
        <PasswordForm />
      </section>
    </>
  );
}
