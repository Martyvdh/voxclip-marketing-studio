"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Card, FormMessage } from "@/components/brand-client";
import { SubmitButton } from "@/components/form";
import {
  approveAsset,
  archiveAsset,
  updateAsset,
  uploadAsset,
} from "@/lib/assets/actions";
import {
  canApproveAsset,
  describeOrigin,
  formatBytes,
  MAX_BYTES,
} from "@/lib/assets/rules";
import type { AssetView } from "@/lib/assets/queries";
import type { FormState } from "@/lib/campaign/actions";

const KINDS = [
  { value: "SCREENSHOT", label: "Screenshot of the app" },
  { value: "SCREEN_RECORDING", label: "Screen recording of the app" },
  { value: "RENDERED_VIDEO", label: "Video made in the editor" },
  { value: "IMAGE", label: "Other image" },
  { value: "AUDIO", label: "Audio" },
  { value: "DOCUMENT", label: "Document" },
];

const ORIGINS = [
  { value: "REAL_PRODUCT_CAPTURE", label: "A real capture of the shipping app" },
  { value: "DESIGNED", label: "Made by us, not claiming to be the app" },
  { value: "GENERATED", label: "Model-generated" },
];

function isImage(mimeType: string) {
  return mimeType.startsWith("image/") && mimeType !== "image/svg+xml";
}

function isVideo(mimeType: string) {
  return mimeType.startsWith("video/");
}

export function UploadForm({
  campaigns,
  currentVersion,
}: {
  campaigns: { id: string; title: string }[];
  currentVersion: string | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(uploadAsset, {});
  const [kind, setKind] = useState("SCREENSHOT");
  const [origin, setOrigin] = useState("REAL_PRODUCT_CAPTURE");

  const showsApp = kind === "SCREENSHOT" || kind === "SCREEN_RECORDING";

  const [tooBig, setTooBig] = useState<string | null>(null);

  return (
    <Card>
      <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
        Add something
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Up to {formatBytes(MAX_BYTES)} per file — that ceiling is the host&apos;s,
        not ours. Anything bigger belongs on a file host; link to it from the
        campaign instead.
      </p>

      <form action={action} className="mt-4 space-y-4">
        <div>
          <label htmlFor="file" className="block text-sm font-medium">
            File
          </label>
          {/*
            Meten zodra je het bestand kiest, niet pas bij het versturen.
            Een upload boven de grens komt bij de hosting nooit aan, dus dan
            klapt de pagina eruit en ben je je hele formulier kwijt. Hier zie je
            het meteen, met het formulier nog gewoon ingevuld.
          */}
          <input
            id="file"
            name="file"
            type="file"
            onChange={(e) => {
              const picked = e.target.files?.[0];
              setTooBig(
                picked && picked.size > MAX_BYTES
                  ? `Dit bestand is ${formatBytes(picked.size)}. De grens ligt op ${formatBytes(MAX_BYTES)} en die is van de hosting, niet van ons — groter komt niet aan. Maak de video kleiner of zet hem op een filehost.`
                  : null,
              );
            }}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
          {tooBig ? (
            <p className="mt-1.5 rounded-lg bg-amber-wash px-3 py-2 text-xs text-amber">
              {tooBig}
            </p>
          ) : null}
          {state.errors?.file ? (
            <p role="alert" className="mt-1 text-xs text-alert">
              {state.errors.file}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="kind" className="block text-sm font-medium">
              What it is
            </label>
            <select
              id="kind"
              name="kind"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            >
              {KINDS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="origin" className="block text-sm font-medium">
              Where it came from
            </label>
            <select
              id="origin"
              name="origin"
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            >
              {ORIGINS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {state.errors?.origin ? (
              <p role="alert" className="mt-1 text-xs text-alert">
                {state.errors.origin}
              </p>
            ) : (
              <p className="mt-1 text-xs text-ink-muted">
                {showsApp && origin === "GENERATED"
                  ? "A generated image cannot be a screenshot. If it shows the app, it has to be the app."
                  : describeOrigin(origin as never)}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="altText" className="block text-sm font-medium">
            Alt text
          </label>
          <input
            id="altText"
            name="altText"
            placeholder="The Timeline with a copied address and a dictated note"
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
          {state.errors?.altText ? (
            <p role="alert" className="mt-1 text-xs text-alert">
              {state.errors.altText}
            </p>
          ) : (
            <p className="mt-1 text-xs text-ink-muted">
              Written now or written never. The quality gate blocks a post
              without it.
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="productVersionShown"
              className="block text-sm font-medium"
            >
              VoxClip version it shows
            </label>
            <input
              id="productVersionShown"
              name="productVersionShown"
              defaultValue={showsApp ? (currentVersion ?? "") : ""}
              placeholder={currentVersion ?? "0.0.0"}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
            {state.errors?.productVersionShown ? (
              <p role="alert" className="mt-1 text-xs text-alert">
                {state.errors.productVersionShown}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="campaignId" className="block text-sm font-medium">
              Campaign
            </label>
            <select
              id="campaignId"
              name="campaignId"
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            >
              <option value="">Not filed under one</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="caption" className="block text-sm font-medium">
            Note (optional)
          </label>
          <input
            id="caption"
            name="caption"
            placeholder="Recorded on the 16th, light mode, 1440 by 900"
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
        </div>

        <FormMessage message={state.message} />
        <SubmitButton pendingLabel="Storing">Add it</SubmitButton>
      </form>
    </Card>
  );
}

export function AssetCard({
  asset,
  canApprove,
  canEdit,
}: {
  asset: AssetView;
  canApprove: boolean;
  canEdit: boolean;
}) {
  const [approveState, approveAction] = useActionState<FormState, FormData>(
    approveAsset,
    {},
  );
  const [archiveState, archiveAction] = useActionState<FormState, FormData>(
    archiveAsset,
    {},
  );
  const [editState, editAction] = useActionState<FormState, FormData>(
    updateAsset,
    {},
  );
  const [editing, setEditing] = useState(false);

  const verdict = canApproveAsset({
    origin: asset.origin,
    kind: asset.kind,
    altText: asset.altText,
    productVersionShown: asset.productVersionShown,
  });

  return (
    <Card>
      <div className="overflow-hidden rounded-lg border border-line bg-paper">
        {isImage(asset.mimeType) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/assets/${asset.id}`}
            alt={asset.altText ?? ""}
            className="max-h-56 w-full object-contain"
          />
        ) : isVideo(asset.mimeType) ? (
          <video
            src={`/assets/${asset.id}`}
            controls
            className="max-h-56 w-full"
          />
        ) : (
          <p className="p-6 text-center font-[family-name:var(--font-mono)] text-xs text-ink-faint">
            {asset.mimeType}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-ink-muted">
          {asset.kind.toLowerCase().replace(/_/g, " ")}
        </span>
        {asset.approved ? (
          <span className="rounded-full bg-teal-wash px-2.5 py-1 text-xs text-teal-deep">
            Approved for use
          </span>
        ) : (
          <span className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-muted">
            Not approved
          </span>
        )}
        {asset.stale ? (
          <span className="rounded-full bg-amber-wash px-2.5 py-1 text-xs text-amber">
            Shows {asset.productVersionShown}, worth a look
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm text-ink">{asset.altText}</p>
      {asset.caption ? (
        <p className="mt-1 text-xs text-ink-muted">{asset.caption}</p>
      ) : null}

      <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-ink-faint">
        {formatBytes(asset.byteSize)} · {describeOrigin(asset.origin)}
        {asset.uploadedBy ? ` · ${asset.uploadedBy}` : ""}
      </p>

      {asset.campaignSlug ? (
        <p className="mt-2 text-xs">
          <Link
            href={`/campaigns/${asset.campaignSlug}`}
            className="text-teal-deep hover:underline"
          >
            {asset.campaignTitle}
          </Link>
        </p>
      ) : null}

      <FormMessage
        message={approveState.message ?? archiveState.message ?? editState.message}
      />

      {editing ? (
        <form action={editAction} className="mt-3 space-y-2 border-t border-line pt-3">
          <input type="hidden" name="assetId" value={asset.id} />
          <label htmlFor={`alt-${asset.id}`} className="block text-sm font-medium">
            Alt text
          </label>
          <input
            id={`alt-${asset.id}`}
            name="altText"
            defaultValue={asset.altText ?? ""}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
          {editState.errors?.altText ? (
            <p role="alert" className="text-xs text-alert">
              {editState.errors.altText}
            </p>
          ) : null}
          <label
            htmlFor={`version-${asset.id}`}
            className="block text-sm font-medium"
          >
            Version it shows
          </label>
          <input
            id={`version-${asset.id}`}
            name="productVersionShown"
            defaultValue={asset.productVersionShown ?? ""}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
          <p className="text-xs text-ink-muted">
            Changing the description withdraws the approval. Someone approved the
            old wording, not this one.
          </p>
          <div className="flex gap-2">
            <SubmitButton pendingLabel="Saving">Save</SubmitButton>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {canApprove && !asset.approved ? (
            verdict.allowed ? (
              <form action={approveAction}>
                <input type="hidden" name="assetId" value={asset.id} />
                <SubmitButton variant="quiet" pendingLabel="Approving">
                  Approve for use
                </SubmitButton>
              </form>
            ) : (
              <p className="text-xs text-ink-muted">{verdict.reason}</p>
            )
          ) : null}

          {canEdit ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs text-ink-muted underline hover:text-ink"
              >
                Edit the details
              </button>
              <form action={archiveAction}>
                <input type="hidden" name="assetId" value={asset.id} />
                <button
                  type="submit"
                  className="text-xs text-ink-muted underline hover:text-ink"
                >
                  Archive it
                </button>
              </form>
            </>
          ) : null}
        </div>
      )}
    </Card>
  );
}
