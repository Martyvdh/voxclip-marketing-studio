/**
 * Waar een element mag staan zonder door de tekst heen te lopen.
 *
 * Dit bestond niet, en dat was een echte fout. De tekst wordt verticaal
 * gecentreerd en groeit dus naar boven en naar beneden mee met hoe lang hij is.
 * Elementen kregen een vaste plek als breuk van de hoogte. Bij een korte regel
 * ging dat goed en bij een lange stond het vinkje dwars door het woord heen.
 *
 * Het is niet op te lossen door de elementen een beetje lager te zetten, want
 * "laag genoeg" hangt af van de tekst in die clip. Dus wordt de ondergrens
 * berekend uit waar de tekst echt eindigt, en zakt alles wat te hoog staat
 * daaronder.
 */

/** Ruimte tussen de onderkant van de tekst en het eerste element. */
export const TEXT_CLEARANCE = 0.06;

/**
 * De hoogste plek waar een element mag staan, als breuk van de framehoogte.
 *
 * `textBottom` is waar de tekst ophoudt, in pixels. Staat er geen tekst, dan
 * mag een element overal en is de ondergrens nul.
 */
export function elementFloor(textBottom: number, height: number): number {
  if (height <= 0) return 0;
  if (textBottom <= 0) return 0;
  return Math.min(0.92, textBottom / height + TEXT_CLEARANCE);
}

/**
 * De plek waar een element daadwerkelijk terechtkomt.
 *
 * Zakken en niet verbergen: een element dat je plaatste en niet terugziet is
 * verwarrender dan een element dat een stukje lager staat dan je bedoelde.
 */
export function placeElementY(wantedY: number, floor: number): number {
  return Math.max(wantedY, floor);
}

/**
 * Of een plek in de tekstband ligt.
 *
 * Alleen voor de test die de startpunten controleert. In de renderer wordt er
 * geklemd; hier wordt er gewaarschuwd, zodat een nieuw startpunt niet stilletjes
 * een element ergens neerzet waar het toch weer weggeduwd wordt.
 */
export function sitsInTextBand(y: number): boolean {
  return y > 0.24 && y < 0.72;
}
