/**
 * Favorieten.
 *
 * Bij honderddrieënzeventig startpunten gebruik je er in de praktijk een stuk of
 * tien. Die elke keer terugzoeken in negen families is het soort werk dat je na
 * drie keer niet meer doet — dan pak je gewoon de bovenste en is de rest dood
 * gewicht.
 *
 * Dit staat los van de browser-component zodat het te testen is zonder React.
 * De opslag zelf is localStorage: het is een voorkeur van deze persoon op deze
 * machine, geen gegeven dat in de database hoort of dat iemand anders aangaat.
 */

export const STORAGE_KEY = "voxclip.video.favourites";

/**
 * Leest de bewaarde lijst.
 *
 * Alles wat eruit komt wordt gecontroleerd, want localStorage is door de
 * gebruiker te bewerken en een kapotte waarde mag de editor niet meenemen.
 */
export function parseFavourites(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((v): v is string => typeof v === "string"))];
  } catch {
    return [];
  }
}

/** Zet of haalt weg. Geeft een nieuwe lijst terug; de oude blijft heel. */
export function toggleFavourite(list: string[], slug: string): string[] {
  return list.includes(slug)
    ? list.filter((s) => s !== slug)
    : [...list, slug];
}

export function isFavourite(list: string[], slug: string): boolean {
  return list.includes(slug);
}

/**
 * Houdt alleen de slugs over die nog bestaan.
 *
 * Een startpunt kan verdwijnen of hernoemd worden. Zonder deze stap houd je een
 * favoriet die nergens heen wijst, en dan staat er een lege plek in je lijst
 * waar je niets aan kunt doen.
 */
export function pruneFavourites(list: string[], known: Set<string>): string[] {
  return list.filter((slug) => known.has(slug));
}
