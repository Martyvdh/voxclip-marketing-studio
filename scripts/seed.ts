/**
 * Seed: the first admin account, the audiences, and Product Truth.
 *
 * Safe to run more than once. It never overwrites a fact that someone has
 * already verified, and it never sends anything anywhere.
 *
 *   npm run db:seed
 */

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";

import { getDb } from "../src/db";
import {
  audiences,
  ctaLines,
  hooks,
  houseFormats,
  pillarDefaults,
  productClaims,
  productTruth,
  sources,
  users,
  type NewProductClaim,
  type Pillar,
} from "../src/db/schema";
import { HOUSE_FORMATS } from "../src/db/seed/house-formats";
import { hashPassword } from "../src/lib/auth/password";

/** The prototype's own content, extracted verbatim. See scripts/extract-legacy.ts. */
interface PrototypeContent {
  LIB?: [string, string, string, string][];
  VID_DEF?: Record<
    string,
    { h1: string; h2: string; hw: string; i1: string; i2: string; pay: string }
  >;
  CTAS_SHORT?: string[];
  CTAS_LI?: string[];
}

const PILLAR_BY_CODE: Record<string, Pillar> = {
  P1: "P1_ONE_PLACE",
  P2: "P2_INSTANT_RECALL",
  P3: "P3_YOUR_STUFF_STAYS_YOURS",
  P4: "P4_FREE_WHERE_LOCAL",
};

function readPrototypeContent(): PrototypeContent {
  try {
    return JSON.parse(
      readFileSync(
        join(process.cwd(), "src", "db", "legacy-content", "prototype-content.json"),
        "utf8",
      ),
    ) as PrototypeContent;
  } catch {
    console.log(
      "No extracted prototype content found. Run: npx tsx scripts/extract-legacy.ts",
    );
    return {};
  }
}

const VERIFIED_AT = new Date("2026-08-12T00:00:00Z");
const NEXT_REVIEW = new Date("2026-09-12T00:00:00Z");

async function main() {
  const db = getDb();

  // ---- the source every fact points at -------------------------------------
  const [siteSource] = await db
    .insert(sources)
    .values({
      url: "https://voxclip.it",
      title: "voxclip.it website copy",
      publisher: "VoxClip",
      retrievedAt: VERIFIED_AT,
      excerpt:
        "The public website is the authoritative source for product scope, pricing, and the free versus paid split.",
    })
    .returning();

  // ---- the first admin ------------------------------------------------------
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@voxclip.it")
    .trim()
    .toLowerCase();

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length === 0) {
    const password = randomBytes(12).toString("base64url");
    await db.insert(users).values({
      email,
      name: "Marty",
      passwordHash: await hashPassword(password),
      role: "ADMIN",
    });
    console.log("\nFirst admin created.");
    console.log(`  email:    ${email}`);
    console.log(`  password: ${password}`);
    console.log("  Change it after your first sign-in. This is printed once.\n");
  } else {
    console.log(`Admin ${email} already exists. Leaving it alone.`);
  }

  // ---- audiences ------------------------------------------------------------
  await db
    .insert(audiences)
    .values([
      {
        slug: "sanne-solo-pro",
        name: "Sanne the solo pro",
        summary:
          "A one-person business who writes, quotes, and answers all day, on her own machine.",
        jobToBeDone:
          "Find the thing she copied or said earlier, without breaking her train of thought.",
        frustration:
          "The thing she needs is three apps back, and retyping it costs her the thread.",
        desiredOutcome:
          "It is pasted where her cursor is, in two keystrokes, and it never left her machine.",
        channels: ["LINKEDIN", "INSTAGRAM_REELS", "EMAIL"],
      },
      {
        slug: "mees-the-maker",
        name: "Mees the maker",
        summary:
          "Works across writing, research, and admin, and lives in short bursts of copy and dictation.",
        jobToBeDone:
          "Keep everything he captures in one place he can search later.",
        frustration:
          "Clipboard history and voice notes live in two different tools that do not know about each other.",
        desiredOutcome:
          "One Timeline, one search, one hotkey, for both.",
        channels: ["TIKTOK", "YOUTUBE_SHORTS", "X"],
      },
    ])
    .onConflictDoNothing();

  // ---- Product Truth --------------------------------------------------------
  const [truth] = await db
    .insert(productTruth)
    .values({
      version: "0.1.0",
      isCurrent: true,
      // Never guessed. Read it from the release tag and update it here.
      productVersion: null,
      releaseState: null,
      verifiedAt: VERIFIED_AT,
      nextReviewAt: NEXT_REVIEW,
      ownerName: "Marty",
      notes:
        "Seeded from docs/product-truth.md. Hotkeys and the shipping version are deliberately unverified.",
    })
    .returning();

  const verified = {
    productTruthId: truth.id,
    status: "VERIFIED" as const,
    confidence: "HIGH" as const,
    verifiedAt: VERIFIED_AT,
    nextReviewAt: NEXT_REVIEW,
    sourceId: siteSource.id,
  };

  const claims: NewProductClaim[] = [
    {
      ...verified,
      key: "identity.one_liner",
      kind: "IDENTITY",
      statement:
        "VoxClip is a free desktop app for Mac and Windows that captures everything you copy and everything you dictate into one searchable Timeline, and pastes it back the instant you need it, by hotkey or by voice.",
      value: null,
    },
    {
      ...verified,
      key: "identity.freemium_line",
      kind: "IDENTITY",
      statement:
        "If it runs on your machine, it is free. If it needs our servers, it is paid.",
      value: null,
    },
    {
      ...verified,
      key: "platform.macos",
      kind: "PLATFORM",
      statement: "VoxClip runs on macOS 12 or later.",
      value: "12",
    },
    {
      ...verified,
      key: "platform.windows",
      kind: "PLATFORM",
      statement: "VoxClip runs on Windows 10 or later.",
      value: "10",
    },
    {
      ...verified,
      key: "platform.linux",
      kind: "CUT_LIST",
      statement: "VoxClip does not support Linux.",
      value: "unsupported",
    },
    {
      ...verified,
      key: "platform.mobile",
      kind: "CUT_LIST",
      statement: "VoxClip does not have a mobile app.",
      value: "unsupported",
    },
    {
      ...verified,
      key: "pricing.monthly_eur",
      kind: "PRICING",
      statement: "VoxClip Plus costs €6.99 per month.",
      value: "6.99",
    },
    {
      ...verified,
      key: "pricing.yearly_eur",
      kind: "PRICING",
      statement: "VoxClip Plus costs €59 per year.",
      value: "59",
    },
    {
      ...verified,
      key: "pricing.trial_days",
      kind: "PRICING",
      statement: "VoxClip Plus has a 7 day free trial.",
      value: "7",
    },
    {
      ...verified,
      key: "privacy.local_first",
      kind: "PRIVACY",
      statement:
        "The Timeline lives on your device. Nothing leaves it unless you turn on a paid cloud feature, and VoxClip tells you plainly before anything is sent.",
      value: null,
    },
    {
      ...verified,
      key: "privacy.dictation_audio",
      kind: "PRIVACY",
      statement: "Dictation audio never leaves your machine, on either tier.",
      value: null,
    },
    {
      ...verified,
      key: "privacy.sync_encryption",
      kind: "PRIVACY",
      statement:
        "Sync is end-to-end encrypted and our servers store only ciphertext. If you lose your recovery code, synced data cannot be restored.",
      value: null,
    },
    {
      ...verified,
      key: "capability.free.semantic_search",
      kind: "CAPABILITY_FREE",
      statement:
        "Search by meaning is free and runs on your device, alongside clipboard history, local dictation, Snippets, Templates, and the Quick-picker.",
      value: null,
    },
    {
      ...verified,
      key: "capability.plus.talk_to_your_stash",
      kind: "CAPABILITY_PLUS",
      statement:
        '"talk to your stash" is part of VoxClip Plus, along with encrypted sync, AI transforms on paste, Enhance, and extended retention.',
      value: null,
    },
    {
      ...verified,
      key: "release.installer_signing",
      kind: "RELEASE",
      statement:
        "Installers are unsigned. The Gatekeeper and SmartScreen warning means unverified developer, not harmful. Code signing is on the roadmap.",
      value: "unsigned",
    },
    // Deliberately unverified. See docs/decisions.md D-007.
    {
      productTruthId: truth.id,
      key: "release.current_version",
      kind: "RELEASE",
      statement:
        "The current shipping version has not been read from the release repository yet.",
      value: null,
      status: "UNVERIFIED",
      confidence: "LOW",
    },
    {
      productTruthId: truth.id,
      key: "hotkey.quickpicker.macos",
      kind: "HOTKEY",
      statement: "The Quick-picker opens with ⌥Space on macOS.",
      value: "⌥Space",
      status: "UNVERIFIED",
      confidence: "LOW",
    },
    {
      productTruthId: truth.id,
      key: "hotkey.dictation.macos",
      kind: "HOTKEY",
      statement: "Dictation starts with ⌘⇧Space on macOS.",
      value: "⌘⇧Space",
      status: "UNVERIFIED",
      confidence: "LOW",
    },
    {
      productTruthId: truth.id,
      key: "hotkey.quickpicker.windows",
      kind: "HOTKEY",
      statement: "The Quick-picker opens with Ctrl+Shift+V on Windows.",
      value: "Ctrl+Shift+V",
      status: "UNVERIFIED",
      confidence: "LOW",
    },
  ];

  await db.insert(productClaims).values(claims).onConflictDoNothing();

  console.log(
    `Product Truth ${truth.version} seeded with ${claims.length} claims. ` +
      `${claims.filter((c) => c.status === "UNVERIFIED").length} are unverified on purpose and will block any asset that relies on them.`,
  );

  // ---- house formats --------------------------------------------------------
  await db
    .insert(houseFormats)
    .values(
      HOUSE_FORMATS.map((f) => ({
        slug: f.slug,
        name: f.name,
        intent: f.intent,
        channels: f.channels,
        aspectRatios: f.aspectRatios,
        hookGuidance: f.hookGuidance,
        evidenceNeeded: f.evidenceNeeded,
        shotList: f.shotList,
        subtitleRule: f.subtitleRule,
        audioRule: f.audioRule,
        thumbnailRule: f.thumbnailRule,
        ctaRule: f.ctaRule,
        a11yRule: f.a11yRule,
      })),
    )
    .onConflictDoNothing();
  console.log(`${HOUSE_FORMATS.length} house formats seeded.`);

  // ---- content carried over from the prototype -------------------------------
  const content = readPrototypeContent();

  if (content.LIB?.length) {
    const rows = content.LIB.filter(([, , pillar]) => PILLAR_BY_CODE[pillar]).map(
      ([code, family, pillar, text]) => ({
        code,
        family,
        pillar: PILLAR_BY_CODE[pillar],
        text,
      }),
    );
    await db.insert(hooks).values(rows).onConflictDoNothing();
    console.log(`${rows.length} hooks carried over from the prototype.`);
  }

  if (content.VID_DEF) {
    const rows = Object.entries(content.VID_DEF)
      .filter(([code]) => PILLAR_BY_CODE[code])
      .map(([code, v]) => ({
        pillar: PILLAR_BY_CODE[code],
        headline: v.h1,
        subhead: v.h2,
        halfword: v.hw,
        example1: v.i1,
        example2: v.i2,
        payoff: v.pay,
      }));
    await db.insert(pillarDefaults).values(rows).onConflictDoNothing();
    console.log(`${rows.length} pillar defaults carried over.`);
  }

  const ctas = [
    ...(content.CTAS_SHORT ?? []).map((text) => ({ family: "short", text })),
    ...(content.CTAS_LI ?? []).map((text) => ({ family: "linkedin", text })),
  ];
  if (ctas.length) {
    await db.insert(ctaLines).values(ctas).onConflictDoNothing();
    console.log(`${ctas.length} call-to-action lines carried over.`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
