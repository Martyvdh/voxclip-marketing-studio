/**
 * What may go in the library, and what may be approved for use.
 *
 * The rule underneath all of this comes from AGENTS.md: a picture that looks
 * like the product has to be the product. A designed graphic is fine as long as
 * it is not pretending, and a generated image may never depict product UI at
 * all. That is not a style preference; it is the difference between marketing
 * and a false claim.
 */

import type { AssetKind, AssetOrigin } from "@/db/schema";

/**
 * Bytes live in Postgres for now, so the cap is real rather than polite.
 *
 * Ten megabytes covers any screenshot and a short rendered clip. Anything
 * longer belongs in a file host, and the page says so instead of failing at
 * upload with a database error.
 */
export const MAX_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME: Record<AssetKind, string[]> = {
  SCREENSHOT: ["image/png", "image/jpeg", "image/webp"],
  SCREEN_RECORDING: ["video/webm", "video/mp4", "image/gif"],
  RENDERED_VIDEO: ["video/webm", "video/mp4"],
  IMAGE: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  AUDIO: ["audio/webm", "audio/mpeg", "audio/wav"],
  DOCUMENT: ["application/pdf"],
};

/** Kinds that show the running application, so the app version matters. */
export const SHOWS_PRODUCT_UI: AssetKind[] = [
  "SCREENSHOT",
  "SCREEN_RECORDING",
];

export interface UploadInput {
  kind: AssetKind;
  origin: AssetOrigin;
  mimeType: string;
  byteSize: number;
  altText: string;
  productVersionShown: string;
}

export type Errors = Record<string, string>;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Everything wrong with an upload, in one pass, so the form fills in once. */
export function validateUpload(input: UploadInput): Errors {
  const errors: Errors = {};

  if (input.byteSize <= 0) {
    errors.file = "Pick a file.";
  } else if (input.byteSize > MAX_BYTES) {
    errors.file = `That is ${formatBytes(input.byteSize)}. The limit is ${formatBytes(
      MAX_BYTES,
    )}; put a longer recording on a file host and link to it from the campaign instead.`;
  }

  const allowed = ALLOWED_MIME[input.kind] ?? [];
  if (input.byteSize > 0 && !allowed.includes(input.mimeType)) {
    errors.file = `A ${input.kind.toLowerCase().replace(/_/g, " ")} should be ${allowed.join(" or ")}, not ${input.mimeType || "an unknown type"}.`;
  }

  if (input.altText.trim().length < 5) {
    errors.altText =
      "Describe what is in it. Alt text is written now or it is written never, and the quality gate blocks a post without it.";
  }

  // A generated image that depicts the app is the one thing this library
  // cannot hold. There is no version of it that is honest.
  if (input.origin === "GENERATED" && SHOWS_PRODUCT_UI.includes(input.kind)) {
    errors.origin =
      "A generated image cannot be a screenshot or a screen recording. If it shows the app, it has to be the app.";
  }

  if (
    input.origin === "REAL_PRODUCT_CAPTURE" &&
    input.productVersionShown.trim().length === 0
  ) {
    errors.productVersionShown =
      "Say which VoxClip version this shows. A screenshot without a version becomes a screenshot of something that no longer exists.";
  }

  return errors;
}

export interface ApprovalInput {
  origin: AssetOrigin;
  kind: AssetKind;
  altText: string | null;
  productVersionShown: string | null;
}

export interface Verdict {
  allowed: boolean;
  reason?: string;
}

/**
 * Approving means "this may go out". It is the last point where a stale
 * screenshot can be caught cheaply.
 */
export function canApproveAsset(input: ApprovalInput): Verdict {
  if (input.origin === "GENERATED" && SHOWS_PRODUCT_UI.includes(input.kind)) {
    return {
      allowed: false,
      reason: "A generated image may not stand in for the product.",
    };
  }

  if (!input.altText || input.altText.trim().length < 5) {
    return { allowed: false, reason: "It needs alt text before it can be used." };
  }

  if (
    SHOWS_PRODUCT_UI.includes(input.kind) &&
    !input.productVersionShown?.trim()
  ) {
    return {
      allowed: false,
      reason: "Record which app version it shows before approving it.",
    };
  }

  return { allowed: true };
}

/**
 * Whether a capture is old enough to be worth a second look.
 *
 * Not an error and not a block. A screenshot from a version behind is often
 * still fine; the point is that somebody decides rather than nobody noticing.
 */
export function looksStale(input: {
  kind: AssetKind;
  productVersionShown: string | null;
  currentVersion: string | null;
}): boolean {
  if (!SHOWS_PRODUCT_UI.includes(input.kind)) return false;
  if (!input.currentVersion || !input.productVersionShown) return false;
  return input.productVersionShown.trim() !== input.currentVersion.trim();
}

export function describeOrigin(origin: AssetOrigin): string {
  switch (origin) {
    case "REAL_PRODUCT_CAPTURE":
      return "A real capture of the shipping app";
    case "DESIGNED":
      return "Made by us, not claiming to be the app";
    case "GENERATED":
      return "Model-generated, never the app";
  }
}

/** A storage key that cannot collide and gives nothing away about the file. */
export function storageKeyFor(assetId: string, mimeType: string): string {
  const extension =
    {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
      "image/svg+xml": "svg",
      "image/gif": "gif",
      "video/webm": "webm",
      "video/mp4": "mp4",
      "audio/webm": "weba",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "application/pdf": "pdf",
    }[mimeType] ?? "bin";

  return `assets/${assetId}.${extension}`;
}
