"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Card, FormMessage } from "@/components/brand-client";
import { SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/campaign/actions";
import {
  approveVersion,
  requestChanges,
  reviseVariant,
} from "@/lib/review/actions";
import type { ReviewItem } from "@/lib/review/queries";
import { canApprove } from "@/lib/review/rules";

const STATUS_TEXT: Record<string, string> = {
  IN_REVIEW: "Waiting on a decision",
  CHANGES_REQUESTED: "Back with the author",
};

function waitedSince(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "since yesterday";
  return `for ${days} days`;
}

export function ReviewCard({
  item,
  canApproveByRole,
}: {
  item: ReviewItem;
  canApproveByRole: boolean;
}) {
  const [approveState, approveAction] = useActionState<FormState, FormData>(
    approveVersion,
    {},
  );
  const [changesState, changesAction] = useActionState<FormState, FormData>(
    requestChanges,
    {},
  );
  const [reviseState, reviseAction] = useActionState<FormState, FormData>(
    reviseVariant,
    {},
  );

  const [revising, setRevising] = useState(false);
  const [showPrevious, setShowPrevious] = useState(false);

  // The same function the server uses, so the page never offers a button that
  // the action is going to refuse.
  const verdict = canApprove({
    status: item.status,
    gatePassed: item.gatePassed,
    isOwner: item.ownedByMe,
    hasCapability: canApproveByRole,
  });

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/campaigns/${item.campaignSlug}`}
            className="font-[family-name:var(--font-display)] font-semibold hover:underline"
          >
            {item.campaignTitle}
          </Link>
          <span className="ml-2 font-[family-name:var(--font-mono)] text-xs text-ink-faint">
            {item.channel.replace(/_/g, " ").toLowerCase()} · {item.variantCode} ·
            v{item.versionNo}
          </span>
        </div>
        <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-ink-muted">
          {STATUS_TEXT[item.status] ?? item.status} · {waitedSince(item.updatedAt)}
        </span>
      </div>

      {item.staleApproval ? (
        <p className="mt-3 rounded-lg bg-amber-wash px-3 py-2 text-sm text-amber">
          An earlier version of this was approved. It has been rewritten since,
          so that approval no longer covers what is here.
        </p>
      ) : null}

      {item.title ? (
        <p className="mt-3 font-[family-name:var(--font-display)] font-semibold">
          {item.title}
        </p>
      ) : null}

      <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{item.body}</p>

      {item.ctaUrl ? (
        <p className="mt-3 font-[family-name:var(--font-mono)] text-xs break-all text-teal-deep">
          {item.ctaUrl}
        </p>
      ) : null}

      {item.previous ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowPrevious((open) => !open)}
            className="text-xs text-ink-muted underline"
            aria-expanded={showPrevious}
          >
            {showPrevious
              ? `Hide version ${item.previous.versionNo}`
              : `Show version ${item.previous.versionNo}`}
          </button>
          {showPrevious ? (
            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-paper p-3 text-sm text-ink-muted">
              {item.previous.body}
            </p>
          ) : null}
        </div>
      ) : null}

      {item.findings.length > 0 ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-xs font-medium text-ink-muted">What the gate found</p>
          <ul className="mt-2 space-y-1.5">
            {item.findings.map((finding, index) => (
              <li key={`${finding.ruleId}-${index}`} className="text-sm">
                <span
                  className={`font-[family-name:var(--font-mono)] text-xs ${
                    finding.severity === "BLOCKER" ? "text-alert" : "text-amber"
                  }`}
                >
                  {finding.ruleId}
                </span>
                <span className="ml-2 text-ink-muted">{finding.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {item.comments.length > 0 ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-xs font-medium text-ink-muted">What was asked for</p>
          <ul className="mt-2 space-y-2">
            {item.comments.map((comment, index) => (
              <li key={`${comment.at.toISOString()}-${index}`} className="text-sm">
                <span className="font-[family-name:var(--font-mono)] text-xs text-ink-faint">
                  {comment.author ?? "someone"},{" "}
                  {comment.at.toISOString().slice(0, 10)}
                </span>
                <span className="ml-2 text-ink-muted">{comment.body}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 space-y-3 border-t border-line pt-4">
        <FormMessage
          message={
            approveState.message ?? changesState.message ?? reviseState.message
          }
        />

        {revising ? (
          <form action={reviseAction} className="space-y-2">
            <input type="hidden" name="variantId" value={item.variantId} />
            <label
              htmlFor={`body-${item.variantId}`}
              className="block text-sm font-medium"
            >
              Write version {item.versionNo + 1}
            </label>
            <textarea
              id={`body-${item.variantId}`}
              name="body"
              rows={6}
              defaultValue={item.body}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
            {reviseState.errors?.body ? (
              <p role="alert" className="text-xs text-alert">
                {reviseState.errors.body}
              </p>
            ) : null}
            <p className="text-xs text-ink-muted">
              Version {item.versionNo} stays where it is. The new one is checked
              against the brand rules and Product Truth on save, and goes back to
              draft.
            </p>
            <div className="flex flex-wrap gap-2">
              <SubmitButton pendingLabel="Saving">Save as a new version</SubmitButton>
              <button
                type="button"
                onClick={() => setRevising(false)}
                className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {verdict.allowed ? (
                <form action={approveAction}>
                  <input type="hidden" name="variantId" value={item.variantId} />
                  <SubmitButton pendingLabel="Approving">
                    Approve version {item.versionNo}
                  </SubmitButton>
                </form>
              ) : (
                <p className="text-sm text-ink-muted">{verdict.reason}</p>
              )}

              <button
                type="button"
                onClick={() => setRevising(true)}
                className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm"
              >
                Revise it
              </button>
            </div>

            {verdict.allowed ? (
              <form action={changesAction} className="space-y-2">
                <input type="hidden" name="variantId" value={item.variantId} />
                <label
                  htmlFor={`comment-${item.variantId}`}
                  className="block text-sm font-medium"
                >
                  Or say what needs to change
                </label>
                <textarea
                  id={`comment-${item.variantId}`}
                  name="comment"
                  rows={2}
                  placeholder="The first line does not stand on its own."
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                />
                {changesState.errors?.comment ? (
                  <p role="alert" className="text-xs text-alert">
                    {changesState.errors.comment}
                  </p>
                ) : null}
                <SubmitButton variant="quiet" pendingLabel="Sending">
                  Send it back
                </SubmitButton>
              </form>
            ) : null}
          </>
        )}
      </div>
    </Card>
  );
}
