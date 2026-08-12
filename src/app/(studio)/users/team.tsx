"use client";

import { useActionState } from "react";

import { Card, FormMessage } from "@/components/brand-client";
import { Field, Select, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/campaign/actions";
import {
  createUser,
  setUserActive,
  setUserRole,
  type CreateUserState,
  type TeamMember,
} from "@/lib/auth/user-actions";
import { ROLE_DESCRIPTIONS } from "@/lib/auth/users";
import { ROLES } from "@/lib/auth/permissions";

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: r }));

export function AddPerson() {
  const [state, action] = useActionState<CreateUserState, FormData>(createUser, {});

  return (
    <Card>
      <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
        Add someone
      </h2>

      {state.created ? (
        <div className="mt-3 rounded-lg border border-line bg-amber-wash p-4">
          <p className="text-sm font-medium text-amber">
            {state.created.name} can sign in now. This password is shown once.
          </p>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-ink-muted">Email</dt>
              <dd className="font-[family-name:var(--font-mono)]">
                {state.created.email}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-muted">Password</dt>
              <dd className="font-[family-name:var(--font-mono)] font-semibold">
                {state.created.password}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-ink-muted">
            Send it to them the way you would send anything you would not want
            read over their shoulder. Ask them to change it on the Account page
            once they are in.
          </p>
        </div>
      ) : null}

      <form action={action} className="mt-4 space-y-4">
        <FormMessage message={state.message} />

        <Field
          id="name"
          label="Name"
          error={state.errors?.name}
          placeholder="Sanne de Vries"
        />

        <Field
          id="email"
          label="Email"
          error={state.errors?.email}
          placeholder="sanne@voxclip.it"
        />

        <Select
          id="role"
          label="What they may do"
          options={ROLE_OPTIONS}
          error={state.errors?.role}
          defaultValue="AUTHOR"
        />

        <div className="rounded-lg border border-line bg-paper p-3">
          <ul className="space-y-2 text-xs text-ink-muted">
            {ROLES.map((role) => (
              <li key={role}>
                <span className="font-[family-name:var(--font-mono)] text-ink">
                  {role}
                </span>{" "}
                {ROLE_DESCRIPTIONS[role]}
              </li>
            ))}
          </ul>
        </div>

        <SubmitButton pendingLabel="Adding">Add person</SubmitButton>
      </form>
    </Card>
  );
}

export function TeamList({
  team,
  currentUserId,
}: {
  team: TeamMember[];
  currentUserId: string;
}) {
  const [roleState, roleAction] = useActionState<FormState, FormData>(
    setUserRole,
    {},
  );
  const [activeState, activeAction] = useActionState<FormState, FormData>(
    setUserActive,
    {},
  );

  return (
    <div className="space-y-3">
      <FormMessage message={roleState.message ?? activeState.message} />

      {team.map((person) => (
        <Card key={person.id} className="py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {person.name}
                {person.id === currentUserId ? (
                  <span className="ml-2 text-xs text-ink-muted">you</span>
                ) : null}
                {!person.isActive ? (
                  <span className="ml-2 rounded border border-line px-1.5 py-0.5 text-[10px] uppercase text-ink-faint">
                    deactivated
                  </span>
                ) : null}
              </p>
              <p className="font-[family-name:var(--font-mono)] text-xs text-ink-faint">
                {person.email}
                {person.lastLoginAt
                  ? ` · last signed in ${person.lastLoginAt.slice(0, 10)}`
                  : " · never signed in"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <form action={roleAction} className="flex items-center gap-1.5">
                <input type="hidden" name="id" value={person.id} />
                <label htmlFor={`role-${person.id}`} className="sr-only">
                  Role for {person.name}
                </label>
                <select
                  id={`role-${person.id}`}
                  name="role"
                  defaultValue={person.role}
                  className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <SubmitButton variant="quiet" pendingLabel="Saving">
                  Save
                </SubmitButton>
              </form>

              <form action={activeAction}>
                <input type="hidden" name="id" value={person.id} />
                <input
                  type="hidden"
                  name="active"
                  value={person.isActive ? "false" : "true"}
                />
                <SubmitButton variant="quiet" pendingLabel="Working">
                  {person.isActive ? "Deactivate" : "Reactivate"}
                </SubmitButton>
              </form>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
