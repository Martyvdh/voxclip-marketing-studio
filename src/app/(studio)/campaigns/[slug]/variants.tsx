"use client";

import { useActionState } from "react";

import Link from "next/link";

import { Card, FormMessage } from "@/components/brand-client";
import { SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/campaign/actions";
import { generateVariants } from "@/lib/content/actions";
import type { VariantView } from "@/lib/content/queries";
import { attachAsset } from "@/lib/content/attach";
import { describeMedia, mediaVerdict, needsMedia } from "@/lib/content/media";
import { sendForReview } from "@/lib/review/actions";
import { canSendForReview } from "@/lib/review/rules";

export interface AttachableAsset {
  id: string;
  altText: string | null;
  kind: string;
  approved: boolean;
}

/**
 * Het beeld bij een verticale post.
 *
 * Staat alleen bij de kanalen waar beeld de post ís. Bij LinkedIn en X zou een
 * leeg vak met "geen beeld" alleen maar suggereren dat er iets ontbreekt.
 */
function Media({
  variant,
  assets,
}: {
  variant: VariantView;
  assets: AttachableAsset[];
}) {
  const [state, action] = useActionState<FormState, FormData>(attachAsset, {});

  if (!needsMedia(variant.channel)) return null;

  const verdict = mediaVerdict({
    channel: variant.channel,
    attachedAssetCount: variant.attachedAssetCount,
    approvedAssetCount: variant.approvedAssetCount,
  });

  const label = describeMedia({
    channel: variant.channel,
    attachedAssetCount: variant.attachedAssetCount,
    approvedAssetCount: variant.approvedAssetCount,
  });

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="text-xs font-medium text-ink-muted">
        Beeld · {label}
      </p>

      {verdict.ok ? null : (
        <p className="mt-1 text-sm text-amber">{verdict.reason}</p>
      )}

      <FormMessage message={state.message} />

      {assets.length === 0 ? (
        <p className="mt-2 text-xs text-ink-muted">
          Er staat nog geen video of opname in de bibliotheek. Maak er een met
          Make a video, exporteer hem en zet hem in Assets.
        </p>
      ) : (
        <form action={action} className="mt-2 flex flex-wrap items-end gap-2">
          <input type="hidden" name="variantId" value={variant.id} />
          <label htmlFor={`asset-${variant.id}`} className="sr-only">
            Kies beeld voor {variant.channel}
          </label>
          <select
            id={`asset-${variant.id}`}
            name="assetId"
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          >
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.approved ? "" : "(nog niet goedgekeurd) "}
                {asset.altText ?? asset.kind}
              </option>
            ))}
          </select>
          <SubmitButton variant="quiet" pendingLabel="Koppelen">
            Hang dit eraan
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

const CHANNELS: { value: string; label: string; note: string }[] = [
  { value: "TIKTOK", label: "TikTok", note: "vertical, needs a real recording" },
  { value: "INSTAGRAM_REELS", label: "Instagram Reels", note: "vertical, needs a real recording" },
  { value: "YOUTUBE_SHORTS", label: "YouTube Shorts", note: "vertical, needs a real recording" },
  { value: "LINKEDIN", label: "LinkedIn", note: "long text" },
  { value: "X", label: "X", note: "280 characters" },
  { value: "THREADS", label: "Threads", note: "500 characters" },
  { value: "BLOG", label: "Blog and Learn", note: "gets a title" },
  { value: "EMAIL", label: "Email", note: "gets a subject" },
];

const STATUS_TEXT: Record<string, string> = {
  DRAFT: "Draft",
  NEEDS_ASSET: "Needs a real recording",
  IN_REVIEW: "In review",
  CHANGES_REQUESTED: "Changes requested",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  PUBLISHING: "Publishing",
  PUBLISHED: "Published",
  FAILED: "Failed",
  ARCHIVED: "Archived",
};

/**
 * The one control that moves a variant off the author's desk.
 *
 * It asks the same function the server action asks, so a blocked draft shows
 * the reason here instead of getting refused after the click.
 */
function SendForReview({ variant }: { variant: VariantView }) {
  const [state, action] = useActionState<FormState, FormData>(sendForReview, {});

  const verdict = canSendForReview({
    status: variant.status,
    gatePassed: variant.passed,
  });

  if (!verdict.allowed) {
    return (
      <p className="mt-4 border-t border-line pt-3 text-sm text-ink-muted">
        {verdict.reason}
      </p>
    );
  }

  return (
    <form action={action} className="mt-4 space-y-2 border-t border-line pt-3">
      <input type="hidden" name="variantId" value={variant.id} />
      <FormMessage message={state.message} />
      <SubmitButton variant="quiet" pendingLabel="Sending">
        Send for review
      </SubmitButton>
    </form>
  );
}

export function Variants({
  slug,
  variants,
  assets,
}: {
  slug: string;
  variants: VariantView[];
  assets: AttachableAsset[];
}) {
  const [state, action] = useActionState<FormState, FormData>(generateVariants, {});

  return (
    <div className="space-y-6">
      <Card>
        <form action={action} className="space-y-4">
          <input type="hidden" name="slug" value={slug} />

          <fieldset>
            <legend className="text-sm font-medium text-ink">
              Draft a variant for
            </legend>
            <p className="mt-1 text-xs text-ink-muted">
              One concept, one campaign code, one tagged link. Each draft is
              checked against the brand rules and Product Truth before it is
              stored, and the result is kept with it.
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {CHANNELS.map((c) => (
                <label
                  key={c.value}
                  className="flex items-start gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="channels"
                    value={c.value}
                    className="mt-1"
                  />
                  <span>
                    {c.label}
                    <span className="block text-xs text-ink-muted">{c.note}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <FormMessage message={state.message} />
          <SubmitButton pendingLabel="Drafting">Draft these</SubmitButton>
        </form>
      </Card>

      {variants.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No variants yet. Pick the channels above and draft them from the brief.
        </p>
      ) : (
        <ul className="space-y-3">
          {variants.map((v) => (
            <li key={v.id}>
              <Card>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <span className="font-[family-name:var(--font-display)] font-semibold">
                      {v.channel.replace(/_/g, " ")}
                    </span>
                    <span className="ml-2 font-[family-name:var(--font-mono)] text-xs text-ink-faint">
                      {v.code} · v{v.versionNo}
                    </span>
                  </div>
                  <span
                    className={`rounded-full border border-line px-2.5 py-1 text-xs font-medium ${
                      v.passed
                        ? "bg-teal-wash text-teal-deep"
                        : "bg-amber-wash text-amber"
                    }`}
                  >
                    {v.passed ? "Passes the gate" : "Blocked"} ·{" "}
                    {STATUS_TEXT[v.status] ?? v.status}
                  </span>
                </div>

                {v.title ? (
                  <p className="mt-3 font-[family-name:var(--font-display)] font-semibold">
                    {v.title}
                  </p>
                ) : null}

                <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{v.body}</p>

                {v.hashtags.length > 0 ? (
                  <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-ink-muted">
                    {v.hashtags.join(" ")}
                  </p>
                ) : null}

                <p className="mt-3">
                  <Link
                    href={`/campaigns/${slug}/handoff/${v.code}`}
                    className="text-sm font-medium text-teal-deep hover:underline"
                  >
                    Open the handoff for {v.channel.replace(/_/g, " ")}
                  </Link>
                </p>

                {v.ctaUrl ? (
                  <p className="mt-3 text-xs">
                    <span className="text-ink-muted">{v.ctaLabel}: </span>
                    <span className="font-[family-name:var(--font-mono)] break-all text-teal-deep">
                      {v.ctaUrl}
                    </span>
                  </p>
                ) : null}

                {v.findings.length > 0 ? (
                  <div className="mt-4 border-t border-line pt-3">
                    <p className="text-xs font-medium text-ink-muted">
                      What the gate found
                    </p>
                    <ul className="mt-2 space-y-2">
                      {v.findings.map((f, i) => (
                        <li key={`${f.ruleId}-${i}`} className="text-sm">
                          <span
                            className={`font-[family-name:var(--font-mono)] text-xs ${
                              f.severity === "BLOCKER" ? "text-alert" : "text-amber"
                            }`}
                          >
                            {f.ruleId}
                          </span>
                          <span className="ml-2 text-ink-muted">{f.message}</span>
                          {f.excerpt ? (
                            <span className="mt-1 block font-[family-name:var(--font-mono)] text-xs text-ink-faint">
                              {f.excerpt}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <Media variant={v} assets={assets} />
                <SendForReview variant={v} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
