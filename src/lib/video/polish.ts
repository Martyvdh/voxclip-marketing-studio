/**
 * De dingen die het verschil maken tussen "gemaakt in een tool" en "gemaakt".
 *
 * Vier stuks, allemaal klein, allemaal berekend uit de tijd. Ze zijn hier apart
 * gezet omdat ze getest kunnen worden zonder canvas, en omdat je dan kunt zien
 * waarom ze zo subtiel zijn: alles wat je hier opvoert, valt in een video van
 * acht seconden meteen op als effect. En een effect dat opvalt leest als
 * amateur, precies het tegenovergestelde van waar het voor bedoeld is.
 */

/** Hoe lang twee clips over elkaar heen liggen bij een wissel. */
export const CROSSFADE_MS = 220;

/**
 * De dekking van de nieuwe clip in de eerste momenten.
 *
 * Onder de tweehonderd milliseconden ziet een harde snede er goedkoop uit; erboven
 * wordt het een overgang waar je naar kijkt in plaats van doorheen.
 */
export function crossfadeAlpha(elapsedMs: number, fadeMs = CROSSFADE_MS): number {
  if (fadeMs <= 0) return 1;
  if (elapsedMs <= 0) return 0;
  if (elapsedMs >= fadeMs) return 1;
  const t = elapsedMs / fadeMs;
  // Zacht beginnen en zacht eindigen. Lineair leest als een dia die verschuift.
  return t * t * (3 - 2 * t);
}

/**
 * Langzame inzoom op beeldmateriaal, het effect dat iedereen kent van
 * documentaires.
 *
 * Vijf procent over de hele clip. Meer en het wordt zeeziek op een telefoon.
 */
export function kenBurns(
  progress: number,
  amount = 0.05,
): { scale: number; offsetX: number; offsetY: number } {
  const t = Math.min(1, Math.max(0, progress));
  const scale = 1 + amount * t;
  // Een klein beetje naar links meebewegen, zodat het geen pure zoom is.
  // De `|| 0` maakt van min nul gewoon nul: geen renderprobleem, wel iets dat
  // je in een vergelijking een keer laat twijfelen.
  const offsetX = -amount * 0.35 * t || 0;
  const offsetY = -amount * 0.15 * t || 0;
  return { scale, offsetX, offsetY };
}

/**
 * Hoeveel van de tekst zichtbaar is als woorden na elkaar binnenkomen.
 *
 * Alles staat er ruim voor het einde van de clip: tekst die pas op de laatste
 * tel compleet is, heeft niemand gelezen.
 */
export function wordsVisible(
  wordCount: number,
  progress: number,
  settleAt = 0.55,
): number {
  if (wordCount <= 0) return 0;
  const t = Math.min(1, Math.max(0, progress));
  if (t >= settleAt) return wordCount;
  return Math.min(wordCount, Math.floor((t / settleAt) * wordCount) + 1);
}

/**
 * De voortgangsbalk onderin.
 *
 * Waarom die er hoort: op een verticaal kanaal beslist iemand in de eerste
 * seconde of hij blijft. Zien dat het bijna klaar is, is een reden om te
 * blijven, en het kost twee pixels.
 */
export function progressWidth(
  elapsedMs: number,
  totalMs: number,
  fullWidth: number,
): number {
  if (totalMs <= 0) return 0;
  const t = Math.min(1, Math.max(0, elapsedMs / totalMs));
  return Math.round(t * fullWidth);
}

/**
 * Een nauwelijks zichtbare beweging op een stilstaand tekstbeeld.
 *
 * Een volledig stilstaand frame leest op een telefoon als een screenshot, en
 * daar scrollen mensen langs. Eén procent is genoeg om levend te lijken zonder
 * dat je het als beweging herkent.
 */
export function breathe(progress: number, amount = 0.01): number {
  const t = Math.min(1, Math.max(0, progress));
  return 1 + amount * t;
}
