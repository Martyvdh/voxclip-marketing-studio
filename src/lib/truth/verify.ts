/**
 * Wat er nodig is voordat een feit als geverifieerd de deur uit mag.
 *
 * Pure functies, want dit is de regel die alles daarachter draagt. Elke tekst
 * wordt tegen deze feiten gehouden; staat er hier iets onjuists in als
 * geverifieerd, dan is de hele controle een stempel zonder inhoud.
 */

import type { ClaimKind } from "@/db/schema";

export interface Verdict {
  allowed: boolean;
  reason?: string;
}

export type Errors = Record<string, string>;

/** Soorten feiten die een concrete waarde horen te hebben, geen zin. */
export const NEEDS_VALUE: ClaimKind[] = ["HOTKEY", "PRICING", "RELEASE"];

/**
 * Hoe lang een feit meegaat voordat iemand er weer naar moet kijken.
 *
 * Een versienummer veroudert bij elke release, een prijs zelden, en de belofte
 * over waar je data staat is een ontwerpbesluit dat niet vanzelf verschuift.
 */
export const REVIEW_MONTHS: Record<ClaimKind, number> = {
  PLATFORM: 6,
  PRICING: 12,
  CAPABILITY_FREE: 3,
  CAPABILITY_PLUS: 3,
  PRIVACY: 12,
  HOTKEY: 3,
  RELEASE: 1,
  IDENTITY: 12,
  CUT_LIST: 6,
  PROHIBITED: 12,
};

export function nextReviewFor(kind: ClaimKind, from = new Date()): Date {
  const next = new Date(from);
  next.setMonth(next.getMonth() + (REVIEW_MONTHS[kind] ?? 6));
  return next;
}

export interface VerifyInput {
  kind: ClaimKind;
  /** De concrete waarde, waar er een is: "0.4.2", "6.99", "⌘⇧Space". */
  value: string;
  /** Waar je het hebt gecontroleerd. Een build, een release, een pagina. */
  checkedAgainst: string;
}

/**
 * Alles wat er mis is, in één keer.
 *
 * De bron is verplicht en dat is het hele punt. "Ik weet het zeker" is precies
 * de reden waarom er drie maanden later een verkeerde sneltoets in een video
 * staat die niemand meer terug kan halen.
 */
export function validateVerification(input: VerifyInput): Errors {
  const errors: Errors = {};

  if (NEEDS_VALUE.includes(input.kind) && input.value.trim().length === 0) {
    errors.value =
      "Vul de waarde in zoals hij nu echt is. Een sneltoets of een versienummer zonder waarde is niet geverifieerd, alleen afgevinkt.";
  }

  if (input.checkedAgainst.trim().length < 4) {
    errors.checkedAgainst =
      "Waar heb je dit gecontroleerd? Noem de build, de release of de pagina. Zonder bron is dit een mening.";
  }

  return errors;
}

/** Herkent een sneltoets die met glyphs is geschreven, zoals brand.md vraagt. */
export function looksLikeHotkey(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;

  // Mac-glyphs of een Windows-combinatie met plussen.
  const macGlyphs = /[⌘⇧⌥⌃]/.test(trimmed);
  const windows = /^(Ctrl|Alt|Shift|Win)(\+(Ctrl|Alt|Shift|Win|[A-Za-z0-9]|Space|Tab|Esc))+$/i.test(
    trimmed,
  );

  return macGlyphs || windows;
}

/** Waarschuwt zonder te blokkeren, want een uitzondering kan kloppen. */
export function hotkeyWarning(kind: ClaimKind, value: string): string | null {
  if (kind !== "HOTKEY") return null;
  if (looksLikeHotkey(value)) return null;

  return "Sneltoetsen schrijven we met de toetsen zelf: ⌥Space op Mac, Ctrl+Shift+V op Windows. Klopt dit toch, laat het dan staan.";
}

/**
 * Of een geverifieerd feit inmiddels weer aandacht nodig heeft.
 *
 * Verlopen is niet hetzelfde als onwaar. Het betekent dat niemand er sinds die
 * datum naar gekeken heeft, en dat is precies wat je wilt weten.
 */
export function isDue(
  claim: { status: string; nextReviewAt: Date | null },
  now = new Date(),
): boolean {
  if (claim.status !== "VERIFIED") return true;
  if (!claim.nextReviewAt) return true;
  return claim.nextReviewAt.getTime() < now.getTime();
}

/** Mag deze rol een feit verifiëren. */
export function canVerify(hasCapability: boolean): Verdict {
  if (!hasCapability) {
    return {
      allowed: false,
      reason:
        "Feiten verifiëren is een reviewer- of beheerdersrol. Dit is de plek waar de rest van het systeem op leunt.",
    };
  }
  return { allowed: true };
}
