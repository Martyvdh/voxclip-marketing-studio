import { describe, expect, it } from "vitest";

import type { AssetKind, AssetOrigin } from "@/db/schema";
import {
  ALLOWED_MIME,
  canApproveAsset,
  describeOrigin,
  formatBytes,
  looksStale,
  MAX_BYTES,
  storageKeyFor,
  validateUpload,
} from "./rules";

const upload = (over: Partial<Parameters<typeof validateUpload>[0]> = {}) =>
  validateUpload({
    kind: "SCREENSHOT",
    origin: "REAL_PRODUCT_CAPTURE",
    mimeType: "image/png",
    byteSize: 240_000,
    altText: "The Timeline with a copied address and a dictated note",
    productVersionShown: "0.4.2",
    ...over,
  });

describe("validateUpload", () => {
  it("accepts a real screenshot with alt text and a version", () => {
    expect(upload()).toEqual({});
  });

  it("refuses an empty file", () => {
    expect(upload({ byteSize: 0 }).file).toMatch(/pick a file/i);
  });

  it("refuses a file over the cap and says what to do instead", () => {
    const errors = upload({ byteSize: MAX_BYTES + 1 });
    expect(errors.file).toMatch(/limit/i);
    expect(errors.file).toMatch(/file host/i);
  });

  it("accepts a file exactly at the cap", () => {
    expect(upload({ byteSize: MAX_BYTES }).file).toBeUndefined();
  });

  it("refuses a type that does not match the kind", () => {
    expect(upload({ mimeType: "application/pdf" }).file).toBeTruthy();
  });

  it("refuses a screenshot without alt text", () => {
    expect(upload({ altText: "" }).altText).toBeTruthy();
    expect(upload({ altText: "  a  " }).altText).toBeTruthy();
  });

  it("refuses a generated screenshot outright", () => {
    const errors = upload({ origin: "GENERATED" });
    expect(errors.origin).toMatch(/has to be the app/i);
  });

  it("refuses a generated screen recording too", () => {
    const errors = upload({
      kind: "SCREEN_RECORDING",
      mimeType: "video/webm",
      origin: "GENERATED",
    });
    expect(errors.origin).toBeTruthy();
  });

  it("allows a generated image that does not claim to be the app", () => {
    const errors = upload({
      kind: "IMAGE",
      origin: "GENERATED",
      mimeType: "image/png",
      productVersionShown: "",
    });
    expect(errors.origin).toBeUndefined();
  });

  it("requires a version for a real capture", () => {
    expect(upload({ productVersionShown: "" }).productVersionShown).toBeTruthy();
  });

  it("does not require a version for a designed graphic", () => {
    const errors = upload({
      kind: "IMAGE",
      origin: "DESIGNED",
      productVersionShown: "",
    });
    expect(errors.productVersionShown).toBeUndefined();
  });

  it("reports every problem at once rather than one per attempt", () => {
    const errors = upload({
      byteSize: 0,
      altText: "",
      origin: "GENERATED",
    });
    expect(Object.keys(errors).sort()).toEqual(["altText", "file", "origin"]);
  });

  it("has an allowlist for every kind, so no kind falls through open", () => {
    const kinds: AssetKind[] = [
      "SCREENSHOT",
      "SCREEN_RECORDING",
      "RENDERED_VIDEO",
      "IMAGE",
      "AUDIO",
      "DOCUMENT",
    ];
    for (const kind of kinds) {
      expect(ALLOWED_MIME[kind]?.length, kind).toBeGreaterThan(0);
    }
  });
});

describe("canApproveAsset", () => {
  const base = {
    origin: "REAL_PRODUCT_CAPTURE" as AssetOrigin,
    kind: "SCREENSHOT" as AssetKind,
    altText: "The Timeline, mid-search",
    productVersionShown: "0.4.2",
  };

  it("allows a described, versioned capture", () => {
    expect(canApproveAsset(base).allowed).toBe(true);
  });

  it("refuses without alt text", () => {
    expect(canApproveAsset({ ...base, altText: null }).allowed).toBe(false);
  });

  it("refuses a capture with no version recorded", () => {
    expect(
      canApproveAsset({ ...base, productVersionShown: null }).allowed,
    ).toBe(false);
  });

  it("does not ask a designed graphic for a version", () => {
    expect(
      canApproveAsset({
        ...base,
        kind: "IMAGE",
        origin: "DESIGNED",
        productVersionShown: null,
      }).allowed,
    ).toBe(true);
  });

  it("never approves a generated stand-in for the product", () => {
    const verdict = canApproveAsset({ ...base, origin: "GENERATED" });
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toMatch(/generated/i);
  });
});

describe("looksStale", () => {
  it("flags a capture from an older version", () => {
    expect(
      looksStale({
        kind: "SCREENSHOT",
        productVersionShown: "0.3.0",
        currentVersion: "0.4.2",
      }),
    ).toBe(true);
  });

  it("is quiet when the versions match", () => {
    expect(
      looksStale({
        kind: "SCREENSHOT",
        productVersionShown: "0.4.2",
        currentVersion: "0.4.2",
      }),
    ).toBe(false);
  });

  it("says nothing when the current version is unknown, rather than guessing", () => {
    expect(
      looksStale({
        kind: "SCREENSHOT",
        productVersionShown: "0.3.0",
        currentVersion: null,
      }),
    ).toBe(false);
  });

  it("ignores anything that does not show the app", () => {
    expect(
      looksStale({
        kind: "IMAGE",
        productVersionShown: "0.3.0",
        currentVersion: "0.4.2",
      }),
    ).toBe(false);
  });
});

describe("small helpers", () => {
  it("formats bytes the way a person reads them", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });

  it("describes each origin in plain words", () => {
    const origins: AssetOrigin[] = [
      "REAL_PRODUCT_CAPTURE",
      "DESIGNED",
      "GENERATED",
    ];
    for (const origin of origins) {
      expect(describeOrigin(origin).length).toBeGreaterThan(10);
    }
  });

  it("builds a storage key with the right extension", () => {
    expect(storageKeyFor("abc", "image/png")).toBe("assets/abc.png");
    expect(storageKeyFor("abc", "video/webm")).toBe("assets/abc.webm");
  });

  it("falls back rather than trusting an unknown type in a filename", () => {
    expect(storageKeyFor("abc", "application/x-msdownload")).toBe("assets/abc.bin");
  });
});
