/**
 * Een voorstel voor de brief, samengesteld uit wat er al ligt.
 *
 * Dit is nadrukkelijk geen AI. Er wordt niets bedacht en niets geformuleerd:
 * het pakt de goedgekeurde pijlerteksten, een hook uit de bibliotheek, een
 * bestaande call-to-action en een geverifieerd feit uit Product Truth, en zet
 * die in de juiste velden. Elk woord dat je ziet stond al ergens, en het
 * voorstel zegt er per veld bij waar het vandaan komt.
 *
 * Dat is de reden dat het zo mag: een gegenereerde brief die klinkt alsof
 * iemand hem geschreven heeft is precies het soort tekst dat ongelezen wordt
 * opgeslagen. Een voorstel dat zichtbaar in elkaar geknipt is, wordt herschreven.
 */

import type { Pillar } from "@/db/schema";

export interface PillarText {
  pillar: Pillar;
  headline: string;
  subhead: string;
  halfword: string;
  example1: string;
  example2: string;
  payoff: string;
}

export interface HookLine {
  code: string;
  family: string;
  pillar: Pillar;
  text: string;
}

export interface ClaimLine {
  key: string;
  statement: string;
  status: string;
}

export interface SuggestInput {
  pillar: Pillar;
  defaults?: PillarText;
  hooks: HookLine[];
  ctas: { family: string; text: string }[];
  claims: ClaimLine[];
}

export interface Suggestion {
  problem: string;
  desiredOutcome: string;
  promise: string;
  proof: string;
  offer: string;
  primaryCta: string;
  ctaPath: string;
  /** Per veld, waar het vandaan komt. Staat onder de knop. */
  sources: string[];
  /** Wat er niet ingevuld kon worden, en waarom. */
  gaps: string[];
}

/** Het feit dat een pijler het meest nodig heeft, als het geverifieerd is. */
const PROOF_KEY: Record<Pillar, string[]> = {
  P1_ONE_PLACE: ["identity.one_liner", "capability.free.semantic_search"],
  P2_INSTANT_RECALL: ["capability.free.semantic_search", "identity.one_liner"],
  P3_YOUR_STUFF_STAYS_YOURS: [
    "privacy.local_first",
    "privacy.dictation_audio",
    "privacy.sync_encryption",
  ],
  P4_FREE_WHERE_LOCAL: [
    "identity.freemium_line",
    "pricing.monthly_eur",
    "pricing.trial_days",
  ],
};

/**
 * Kiest steeds dezelfde hook voor dezelfde pijler.
 *
 * Bewust niet willekeurig. Twee keer op de knop drukken en iets anders krijgen
 * nodigt uit tot doorklikken tot het goed klinkt, en dat is precies het
 * omgekeerde van zelf nadenken.
 */
function firstHookFor(hooks: HookLine[], pillar: Pillar): HookLine | undefined {
  const forPillar = hooks
    .filter((hook) => hook.pillar === pillar)
    .sort((a, b) => a.code.localeCompare(b.code));

  return forPillar.find((hook) => hook.family === "short") ?? forPillar[0];
}

function firstCta(ctas: { family: string; text: string }[]): string | undefined {
  const sorted = [...ctas].sort((a, b) => a.text.localeCompare(b.text));
  return (sorted.find((cta) => cta.family === "short") ?? sorted[0])?.text;
}

function verifiedProof(
  claims: ClaimLine[],
  pillar: Pillar,
): ClaimLine | undefined {
  for (const key of PROOF_KEY[pillar]) {
    const claim = claims.find((c) => c.key === key && c.status === "VERIFIED");
    if (claim) return claim;
  }
  return undefined;
}

/**
 * Stelt een concept samen. Slaat niets op, dat doet het formulier pas als jij
 * op opslaan drukt.
 */
export function suggestBrief(input: SuggestInput): Suggestion {
  const sources: string[] = [];
  const gaps: string[] = [];

  const defaults = input.defaults;
  const hook = firstHookFor(input.hooks, input.pillar);
  const cta = firstCta(input.ctas);
  const proof = verifiedProof(input.claims, input.pillar);

  if (!defaults) {
    gaps.push(
      "Voor deze pijler staat er geen pijlertekst in de database. Draai de seed opnieuw, of vul de brief met de hand.",
    );
  }

  if (!hook) {
    gaps.push("Er staat geen hook voor deze pijler in de bibliotheek.");
  }

  if (!proof) {
    gaps.push(
      "Er is voor deze pijler geen geverifieerd feit om naar te wijzen. Kijk op Truth wat er nog openstaat, of noem zelf de opname die je gaat laten zien.",
    );
  }

  if (defaults) sources.push(`Belofte en resultaat: pijlertekst ${input.pillar}`);
  if (hook) sources.push(`Probleem: hook ${hook.code} uit de bibliotheek`);
  if (proof) sources.push(`Bewijs: geverifieerd feit ${proof.key}`);
  if (cta) sources.push("Call to action: goedgekeurde regel");

  return {
    problem: hook?.text ?? "",
    desiredOutcome: defaults
      ? `${defaults.payoff} ${defaults.example1}`.trim()
      : "",
    promise: defaults?.headline ?? "",
    proof: proof?.statement ?? "",
    offer: "De gratis download voor Mac en Windows.",
    primaryCta: cta ?? "Download VoxClip",
    ctaPath: "/download",
    sources,
    gaps,
  };
}

/** Hoeveel van de zeven velden een voorstel kon vullen. */
export function filledCount(suggestion: Suggestion): number {
  return [
    suggestion.problem,
    suggestion.desiredOutcome,
    suggestion.promise,
    suggestion.proof,
    suggestion.offer,
    suggestion.primaryCta,
    suggestion.ctaPath,
  ].filter((value) => value.trim().length > 0).length;
}
