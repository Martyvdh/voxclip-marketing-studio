"use client";

import { useActionState, useState } from "react";

import { Card, FormMessage } from "@/components/brand-client";
import { SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/campaign/actions";
import { recordManualPublication } from "@/lib/channels/actions";
import type { HandoffField } from "@/lib/channels/handoff";

export function CopyField({ field }: { field: HandoffField }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(field.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{field.label}</h3>
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium"
        >
          {copied ? "Copied" : `Copy ${field.label.toLowerCase()}`}
        </button>
      </div>

      <pre className="mt-3 whitespace-pre-wrap break-words font-[family-name:var(--font-mono)] text-sm text-ink">
        {field.value}
      </pre>

      {field.hint ? (
        <p className="mt-2 text-xs text-ink-muted">{field.hint}</p>
      ) : null}

      <span aria-live="polite" className="sr-only">
        {copied ? `${field.label} copied` : ""}
      </span>
    </Card>
  );
}

export function Checklist({ items }: { items: string[] }) {
  const [done, setDone] = useState<Set<number>>(new Set());

  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={item}>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={done.has(i)}
              onChange={(e) =>
                setDone((prev) => {
                  const next = new Set(prev);
                  if (e.target.checked) next.add(i);
                  else next.delete(i);
                  return next;
                })
              }
              className="mt-0.5"
            />
            <span className={done.has(i) ? "text-ink-faint line-through" : ""}>
              {item}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export function RecordPost({
  variantId,
  slug,
  alreadyPosted,
  postedUrl,
}: {
  variantId: string;
  slug: string;
  alreadyPosted: boolean;
  postedUrl: string | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    recordManualPublication,
    {},
  );

  if (alreadyPosted) {
    return (
      <Card>
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          Recorded as posted
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Posting this again would be a second variant, which is also how you keep
          the results apart.
        </p>
        {postedUrl ? (
          <a
            href={postedUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 block break-all font-[family-name:var(--font-mono)] text-xs text-teal-deep hover:underline"
          >
            {postedUrl}
          </a>
        ) : null}
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
        Posted it? Paste the link
      </h2>
      <p className="mt-1 text-xs text-ink-muted">
        The address of the post itself. That is the receipt: it turns a claim
        that something went out into something anyone can check.
      </p>

      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="variantId" value={variantId} />
        <input type="hidden" name="slug" value={slug} />

        {state.ok ? <FormMessage tone="ok" message="Recorded." /> : null}
        <FormMessage message={state.message} />

        <div>
          <label htmlFor="url" className="sr-only">
            Address of the post
          </label>
          <input
            id="url"
            name="url"
            type="url"
            placeholder="https://www.linkedin.com/posts/..."
            aria-invalid={state.errors?.url ? true : undefined}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
          {state.errors?.url ? (
            <p role="alert" className="mt-1 text-xs text-alert">
              {state.errors.url}
            </p>
          ) : null}
        </div>

        <SubmitButton pendingLabel="Recording">Record it</SubmitButton>
      </form>
    </Card>
  );
}
