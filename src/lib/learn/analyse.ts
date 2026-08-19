/**
 * Wat werkt er, en wat is nog te vroeg om te zeggen.
 *
 * Dit is het stuk dat een marketingtool onderscheidt van een agenda. De rest van
 * de Studio houdt bij wát je deed; dit zegt wat je ervan moet leren.
 *
 * Eén regel staat boven alles: **liever niets zeggen dan iets verzinnen.**
 *
 * Met vier posts is elk verschil ruis. Een tool die dan toch "video's met een
 * vraag doen het beter" roept, klinkt slim en stuurt je de verkeerde kant op —
 * en je merkt het pas na twintig video's in die richting. Daarom heeft elke
 * bevinding een ondergrens aan posts en aan verschil, en zegt hij het gewoon
 * als hij er nog niet is.
 *
 * Puur. Geen database, geen klok. Alles komt binnen als argument.
 */

export interface Post {
  variantId: string;
  channel: string;
  postedAt: Date;
  /** Het bijschrift zoals het eruit ging. */
  body: string;
  hasVideo: boolean;
  /** Null betekent niet gemeten, en dat is iets anders dan nul. */
  views: number | null;
  likes: number | null;
}

/** Minder dan dit per groep en we zeggen niets. */
export const MIN_PER_GROUP = 3;

/** Onder dit verschil is het ruis, hoeveel posts je ook hebt. */
export const MIN_RATIO = 1.4;

// --- eigenschappen van een post --------------------------------------------

/** Opent het bijschrift met een vraag? */
export function opensWithQuestion(body: string): boolean {
  const first = firstLine(body);
  return first.includes("?");
}

/** De eerste regel, want dat is wat iemand ziet voordat hij doorklikt. */
export function firstLine(body: string): string {
  return body.split(/\n/)[0]?.trim() ?? "";
}

export function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Kort of lang bijschrift, op de mediaan van wat je zelf schrijft. */
export function isShort(body: string, median: number): boolean {
  return words(body) <= median;
}

// --- rekenen ---------------------------------------------------------------

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/**
 * De mediaan en niet het gemiddelde.
 *
 * Eén video die toevallig aanslaat trekt een gemiddelde zo ver omhoog dat alles
 * eromheen onzichtbaar wordt. Bij tien posts is dat geen uitzondering maar de
 * verwachting.
 */
function medianViews(posts: Post[]): number {
  return median(posts.map((p) => p.views).filter((v): v is number => v !== null));
}

export type Confidence = "te vroeg" | "aanwijzing" | "duidelijk";

export interface Finding {
  /** Waar dit over gaat, in gewone taal. */
  question: string;
  /** Wat het antwoord is, of dat het er nog niet is. */
  verdict: string;
  confidence: Confidence;
  /** Hoeveel posts er in elke kant zaten. */
  sample: [number, number];
}

/**
 * Vergelijkt twee groepen posts op mediane weergaven.
 *
 * Geeft altijd een bevinding terug, ook als die "te vroeg" is. Dat is met opzet:
 * een leeg scherm laat je denken dat er niets gemeten wordt, terwijl "nog drie
 * posts nodig" precies vertelt wat je moet doen.
 */
export function compare(
  question: string,
  withIt: Post[],
  without: Post[],
  labels: [string, string],
): Finding {
  const sample: [number, number] = [withIt.length, without.length];

  if (withIt.length < MIN_PER_GROUP || without.length < MIN_PER_GROUP) {
    const needed = Math.max(
      MIN_PER_GROUP - withIt.length,
      MIN_PER_GROUP - without.length,
    );
    return {
      question,
      verdict: `Nog te vroeg. Er ${needed === 1 ? "is nog één post" : `zijn nog ${needed} posts`} nodig voordat hier iets over te zeggen valt.`,
      confidence: "te vroeg",
      sample,
    };
  }

  const a = medianViews(withIt);
  const b = medianViews(without);

  if (a === 0 || b === 0) {
    return {
      question,
      verdict: "Nog geen cijfers binnen. Koppel TikTok of vul de weergaven in.",
      confidence: "te vroeg",
      sample,
    };
  }

  const ratio = a / b;
  const better = ratio >= 1 ? labels[0] : labels[1];
  const factor = ratio >= 1 ? ratio : 1 / ratio;

  if (factor < MIN_RATIO) {
    return {
      question,
      verdict: `Maakt weinig uit. ${labels[0]} en ${labels[1]} liggen dicht bij elkaar.`,
      confidence: "aanwijzing",
      sample,
    };
  }

  const total = withIt.length + without.length;
  return {
    question,
    verdict: `${better} doet het ${factor.toFixed(1)}× beter.`,
    confidence: total >= 10 ? "duidelijk" : "aanwijzing",
    sample,
  };
}

/**
 * Alles wat er uit je posts te halen valt.
 *
 * Alleen eigenschappen die we echt weten: de tekst die eruit ging, of er een
 * video bij zat, en wanneer het geplaatst is. Niets geraden.
 */
export function findings(posts: Post[]): Finding[] {
  const measured = posts.filter((p) => p.views !== null);
  const medianWords = median(measured.map((p) => words(p.body)));

  const morning = (p: Post) => p.postedAt.getHours() < 12;

  return [
    compare(
      "Werkt een vraag als opening?",
      measured.filter((p) => opensWithQuestion(p.body)),
      measured.filter((p) => !opensWithQuestion(p.body)),
      ["Openen met een vraag", "Openen met een bewering"],
    ),
    compare(
      "Kort of lang bijschrift?",
      measured.filter((p) => isShort(p.body, medianWords)),
      measured.filter((p) => !isShort(p.body, medianWords)),
      ["Een kort bijschrift", "Een lang bijschrift"],
    ),
    compare(
      "Maakt een video verschil?",
      measured.filter((p) => p.hasVideo),
      measured.filter((p) => !p.hasVideo),
      ["Met video", "Zonder video"],
    ),
    compare(
      "Ochtend of avond posten?",
      measured.filter(morning),
      measured.filter((p) => !morning(p)),
      ["'s Ochtends posten", "'s Middags of 's avonds posten"],
    ),
  ];
}

/** De drie best gelopen posts, om te zien wát er dan werkte. */
export function best(posts: Post[], count = 3): Post[] {
  return [...posts]
    .filter((p) => p.views !== null)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, count);
}

/**
 * Wat je nu zou moeten doen.
 *
 * Eén zin. Als er nog niets te leren valt, zegt hij dat en niet meer — een
 * verzonnen advies is erger dan geen advies.
 */
export function nextMove(posts: Post[]): string {
  const measured = posts.filter((p) => p.views !== null);

  if (posts.length === 0) {
    return "Nog niets geplaatst. Eén video is genoeg om te beginnen; het leren start bij de derde.";
  }

  if (measured.length === 0) {
    return "Er staan posts, maar er zijn nog geen cijfers. Koppel TikTok, dan komen ze vanzelf binnen.";
  }

  if (measured.length < 6) {
    const needed = 6 - measured.length;
    return `${measured.length} ${measured.length === 1 ? "post" : "posts"} gemeten. Nog ${needed} te gaan voordat verschillen iets betekenen — tot dan is elk patroon toeval.`;
  }

  const clear = findings(posts).filter((f) => f.confidence === "duidelijk");
  if (clear.length === 0) {
    return "Genoeg posts, geen duidelijke verschillen. Dat is ook een antwoord: je vorm zit goed, het onderwerp doet het werk. Probeer eens iets dat er echt anders uitziet.";
  }

  return `${clear[0].verdict} Maak de volgende drie zo.`;
}
