"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Card, FormMessage } from "@/components/brand-client";
import { SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/campaign/actions";
import { cancelSchedule, schedulePost } from "@/lib/schedule/actions";
import { describeDue, formatInZone, SLOT_HINTS } from "@/lib/schedule/plan";
import type { PlannedPost, SchedulableVariant } from "@/lib/schedule/queries";

export function PlannedCard({
  post,
  canSchedule,
}: {
  post: PlannedPost;
  canSchedule: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(cancelSchedule, {});

  const time = formatInZone(post.runAt).split(", ")[1] ?? "";

  return (
    <div className="rounded-lg border border-line bg-paper p-2.5">
      <p className="font-[family-name:var(--font-mono)] text-xs text-ink-faint">
        {time} · {post.channel.replace(/_/g, " ").toLowerCase()}
      </p>
      <Link
        href={`/campaigns/${post.campaignSlug}/handoff/${post.variantCode}`}
        className="mt-1 block text-sm font-medium hover:underline"
      >
        {post.campaignTitle}
      </Link>
      <p className="mt-1 line-clamp-3 text-xs text-ink-muted">{post.excerpt}</p>

      <p className="mt-2 text-xs">
        {post.posted ? (
          <span className="text-teal-deep">Logged as posted</span>
        ) : (
          <span className="text-ink-muted">{describeDue(post.runAt)}</span>
        )}
      </p>

      {canSchedule && !post.posted ? (
        <form action={action} className="mt-2">
          <input type="hidden" name="scheduleId" value={post.id} />
          <FormMessage message={state.message} />
          <button
            type="submit"
            className="text-xs text-ink-muted underline hover:text-ink"
          >
            Take it off
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function PlanForm({
  variants,
  defaultDate,
}: {
  variants: SchedulableVariant[];
  defaultDate: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(schedulePost, {});
  const [selected, setSelected] = useState(variants[0]?.variantId ?? "");

  if (variants.length === 0) {
    return (
      <Card>
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          Nothing to plan yet
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Only an approved variant gets a slot, and only for the version that was
          approved. Anything rewritten since is missing from this list on
          purpose.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
        Plan a post
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Times are Amsterdam time. This puts it on the calendar and in the
        handoff. Nothing posts by itself.
      </p>

      <form action={action} className="mt-4 space-y-4">
        <div>
          <label htmlFor="variantId" className="block text-sm font-medium">
            What
          </label>
          <select
            id="variantId"
            name="variantId"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          >
            {variants.map((variant) => (
              <option key={variant.variantId} value={variant.variantId}>
                {variant.campaignTitle} · {variant.channel.replace(/_/g, " ").toLowerCase()}
                {variant.alreadyPlanned ? " (already planned)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="date" className="block text-sm font-medium">
              Day
            </label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={defaultDate}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="time" className="block text-sm font-medium">
              Time
            </label>
            <input
              id="time"
              name="time"
              type="time"
              defaultValue="09:00"
              list="slot-hints"
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
            <datalist id="slot-hints">
              {SLOT_HINTS.map((hint) => (
                <option key={hint.time} value={hint.time}>
                  {hint.note}
                </option>
              ))}
            </datalist>
          </div>
        </div>

        <FormMessage message={state.message} />
        <SubmitButton pendingLabel="Planning">Put it on the calendar</SubmitButton>
      </form>
    </Card>
  );
}
